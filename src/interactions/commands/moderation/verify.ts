import { Button, ChatInput } from '@akki256/discord-interaction';
import { Captcha } from '@modules/captcha';
import { permissionField } from '@modules/fields';
import { Duration } from '@modules/format';
import { permToText } from '@modules/util';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  GuildMemberRoleManager,
  PermissionFlagsBits,
  inlineCode,
  TextChannel,
} from 'discord.js';

const duringAuthentication = new Set<string>();

const verifyTypes = {
  button: 'Bouton',
  image: 'Image',
} satisfies Record<string, string>;
type VerifyType = keyof typeof verifyTypes;

const verifyCommand = new ChatInput(
  {
    name: 'verify',
    description: 'Créer un panneau de vérification dans un salon spécifié (Modérateurs uniquement)',
    options: [
      {
        name: 'type',
        description: 'Type de vérification',
        choices: Object.entries(verifyTypes).map(([value, name]) => ({
          name,
          value,
        })),
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'role',
        description: 'Rôle à attribuer après une vérification réussie',
        type: ApplicationCommandOptionType.Role,
        required: true,
      },
      {
        name: 'channel',
        description: 'Salon où envoyer le panneau de vérification (par défaut : salon actuel)',
        type: ApplicationCommandOptionType.Channel,
        channelTypes: [0], // 0 = TextChannel
      },
      {
        name: 'description',
        description: 'Description de l’embed (utilisez deux espaces pour un saut de ligne)',
        type: ApplicationCommandOptionType.String,
        maxLength: 4096,
      },
      {
        name: 'color',
        description: 'Couleur de l’embed',
        type: ApplicationCommandOptionType.Number,
        choices: [
          { name: '🔴 Rouge', value: Colors.Red },
          { name: '🟠 Orange', value: Colors.Orange },
          { name: '🟡 Jaune', value: Colors.Yellow },
          { name: '🟢 Vert', value: Colors.Green },
          { name: '🔵 Bleu', value: Colors.Blue },
          { name: '🟣 Violet', value: Colors.Purple },
          { name: '⚪ Blanc', value: Colors.White },
          { name: '⚫ Noir', value: Colors.DarkButNotBlack },
        ],
      },
      {
        name: 'image',
        description: 'Image',
        type: ApplicationCommandOptionType.Attachment,
      },
    ],
    // Correction : Utilisation des noms corrects en camelCase dans un tableau
    defaultMemberPermissions: ['ManageRoles', 'ManageChannels'],
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const role = interaction.options.getRole('role', true);
    const channelOption = interaction.options.getChannel('channel');
    const targetChannel = channelOption
      ? (interaction.guild.channels.cache.get(channelOption.id) as TextChannel)
      : (interaction.channel as TextChannel);

    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.reply({
        content: `${inlineCode('❌')} Salon invalide ou non textuel.`,
        ephemeral: true,
      });
    }

    if (
      !interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) ||
      !interaction.guild.members.me?.permissionsIn(targetChannel).has(PermissionFlagsBits.SendMessages)
    ) {
      return interaction.reply({
        content: permissionField(
          // Correction : Tableau de permissions
          ['ManageRoles', 'SendMessages'],
          { label: 'Le bot n’a pas les permissions nécessaires' }
        ),
        ephemeral: true,
      });
    }

    if (role.managed || role.id === interaction.guild.roles.everyone.id) {
      return interaction.reply({
        content: `${inlineCode('❌')} Ce rôle ne peut pas être utilisé pour la vérification`,
        ephemeral: true,
      });
    }

    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.member.roles.highest.position < role.position
    ) {
      return interaction.reply({
        content: `${inlineCode('❌')} Vous ne pouvez pas utiliser un rôle supérieur au vôtre.`,
        ephemeral: true,
      });
    }

    if (!role.editable) {
      return interaction.reply({
        content: `${inlineCode('❌')} Le bot ne peut pas attribuer ce rôle (position trop élevée).`,
        ephemeral: true,
      });
    }

    const verifyType: VerifyType = interaction.options.getString('type', true) as VerifyType;
    const customDescription = interaction.options.getString('description')?.replace('  ', '\n');
    const defaultDescription = `Bienvenue sur ${interaction.guild.name} !\nVérifiez-vous pour accéder au serveur.`;

    const verifyEmbed = new EmbedBuilder()
      .setTitle('🌟 Vérification des membres')
      .setDescription(customDescription || defaultDescription)
      .setColor(interaction.options.getNumber('color') ?? Colors.Green)
      .setThumbnail(interaction.guild.iconURL() || null)
      .setImage(interaction.options.getAttachment('image')?.url || null)
      .addFields({
        name: '🔑 Type de vérification',
        value: verifyTypes[verifyType],
        inline: true,
      })
      .setFooter({
        text: `Serveur : ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL() || undefined,
      })
      .setTimestamp();

    await targetChannel.send({
      embeds: [verifyEmbed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId(`kaori-js:verify-${verifyType}-${role.id}`)
            .setLabel('Vérifier maintenant')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        ),
      ],
    });

    await interaction.reply({
      content: `${inlineCode('✅')} Panneau de vérification envoyé dans ${targetChannel.toString()}.`,
      ephemeral: true,
    });
  },
);

const verifyButton = new Button(
  {
    customId: /^kaori-js:verify-(button|image)-\d+$/,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const [_, type, roleId] = interaction.customId.split('-');
    const roles = interaction.member.roles;

    if (duringAuthentication.has(interaction.user.id))
      return interaction.reply({
        content: `${inlineCode('❌')} Vous êtes déjà en cours de vérification !`,
        ephemeral: true,
      });
    if (!roleId || !(roles instanceof GuildMemberRoleManager))
      return interaction.reply({
        content: `${inlineCode('❌')} Erreur lors de la vérification.`,
        ephemeral: true,
      });
    if (roles.cache.has(roleId))
      return interaction.reply({
        content: `${inlineCode('✅')} Vous êtes déjà vérifié !`,
        ephemeral: true,
      });

    if (type === 'button') {
      roles
        .add(roleId, 'Vérification via bouton')
        .then(() =>
          interaction.reply({
            content: `${inlineCode('✅')} Vérification réussie ! Bienvenue !`,
            ephemeral: true,
          }),
        )
        .catch(() =>
          interaction.reply({
            content: `${inlineCode('❌')} Impossible d’attribuer le rôle. Contactez un administrateur.`,
            ephemeral: true,
          }),
        );
    }

    if (type === 'image') {
      await interaction.deferReply({ ephemeral: true });

      const { image, text } = Captcha.create(
        { color: '#4b9d6e' },
        {},
        { amount: 5, blur: 25 },
        { rotate: 15, skew: true },
      );

      interaction.user
        .send({
          embeds: [
            new EmbedBuilder()
              .setTitle('🔐 Vérification par Captcha')
              .setDescription(
                [
                  '➡️ Saisissez le texte vert affiché dans l’image ci-dessous.',
                  '⏳ Vous avez 1 minute et 3 tentatives maximum.',
                  '⚠️ En cas d’échec, réessayez après 5 minutes.',
                ].join('\n'),
              )
              .setColor(Colors.Blurple)
              .setImage('attachment://kaori-js-captcha.jpeg')
              .setFooter({
                text: 'Sécurité : Aucun mot de passe ou QR code requis.',
              })
              .setTimestamp(),
          ],
          files: [
            new AttachmentBuilder(image, { name: 'kaori-js-captcha.jpeg' }),
          ],
        })
        .then(() => {
          duringAuthentication.add(interaction.user.id);
          interaction.followUp(
            `${inlineCode('📩')} Vérifiez vos DM pour continuer.`,
          );

          if (!interaction.user.dmChannel) return;

          const collector = interaction.user.dmChannel.createMessageCollector({
            filter: (v) => v.author.id === interaction.user.id,
            time: Duration.toMS('1m'),
            max: 3,
          });

          collector.on('collect', (tryMessage) => {
            if (tryMessage.content !== text) return;

            roles
              .add(roleId, 'Vérification via captcha')
              .then(() =>
                interaction.user.send(
                  `${inlineCode('✅')} Vérification réussie ! Bienvenue sur le serveur !`,
                ),
              )
              .catch(() =>
                interaction.user.send(
                  `${inlineCode('❌')} Échec de l’attribution du rôle. Contactez un administrateur.`,
                ),
              )
              .finally(() => collector.stop());
          });

          collector.on('end', (collection) => {
            if (collection.size === 3) {
              interaction.user.send(
                `${inlineCode('❌')} Échec après 3 tentatives. Réessayez dans 5 minutes.`,
              );
              setTimeout(
                () => duringAuthentication.delete(interaction.user.id),
                Duration.toMS('5m'),
              );
            } else duringAuthentication.delete(interaction.user.id);
          });
        })
        .catch(() =>
          interaction.followUp({
            content: `${inlineCode('❌')} Activez vos DM pour recevoir le captcha.`,
            ephemeral: true,
          }),
        );
    }
  },
);

export default [verifyCommand, verifyButton];
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
        description: 'Rôle à attribuer après vérification',
        type: ApplicationCommandOptionType.Role,
        required: true,
      },
      {
        name: 'channel',
        description: 'Salon où envoyer le panneau (par défaut : salon actuel)',
        type: ApplicationCommandOptionType.Channel,
        channelTypes: [0], // TextChannel
      },
      {
        name: 'description',
        description: 'Description de l’embed (deux espaces pour un saut de ligne)',
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
        description: 'Image pour l’embed',
        type: ApplicationCommandOptionType.Attachment,
      },
    ],
    defaultMemberPermissions: ['ManageRoles', 'ManageChannels'], // Permissions en tableau camelCase
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const role = interaction.options.getRole('role', true);
    const channelOption = interaction.options.getChannel('channel');
    const targetChannel = channelOption
      ? (interaction.guild.channels.cache.get(channelOption.id) as TextChannel)
      : (interaction.channel as TextChannel);

    // Vérifications des permissions et du salon
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
        content: permissionField(['ManageRoles', 'SendMessages'], {
          label: 'Le bot n’a pas les permissions nécessaires',
        }),
        ephemeral: true,
      });
    }

    if (role.managed || role.id === interaction.guild.roles.everyone.id) {
      return interaction.reply({
        content: `${inlineCode('❌')} Ce rôle ne peut pas être utilisé.`,
        ephemeral: true,
      });
    }

    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.member.roles.highest.position <= role.position
    ) {
      return interaction.reply({
        content: `${inlineCode('❌')} Le rôle est supérieur ou égal au vôtre.`,
        ephemeral: true,
      });
    }

    if (!role.editable) {
      return interaction.reply({
        content: `${inlineCode('❌')} Le bot ne peut pas attribuer ce rôle.`,
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
            .setCustomId(`verify-${verifyType}-${role.id}`) // Simplification du customId
            .setLabel('Vérifier maintenant')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        ),
      ],
    });

    await interaction.reply({
      content: `${inlineCode('✅')} Panneau envoyé dans ${targetChannel.toString()}.`,
      ephemeral: true,
    });
  },
);

const verifyButton = new Button(
  {
    customId: /^verify-(button|image)-\d+$/, // Regex mis à jour
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const [_, type, roleId] = interaction.customId.split('-');
    const roles = interaction.member.roles;

    if (duringAuthentication.has(interaction.user.id)) {
      return interaction.reply({
        content: `${inlineCode('❌')} Vérification déjà en cours.`,
        ephemeral: true,
      });
    }

    if (!roleId || !(roles instanceof GuildMemberRoleManager)) {
      return interaction.reply({
        content: `${inlineCode('❌')} Erreur lors de la vérification.`,
        ephemeral: true,
      });
    }

    if (roles.cache.has(roleId)) {
      return interaction.reply({
        content: `${inlineCode('✅')} Déjà vérifié !`,
        ephemeral: true,
      });
    }

    if (type === 'button') {
      try {
        await roles.add(roleId, 'Vérification via bouton');
        await interaction.reply({
          content: `${inlineCode('✅')} Vérification réussie ! Bienvenue !`,
          ephemeral: true,
        });
      } catch (error) {
        await interaction.reply({
          content: `${inlineCode('❌')} Échec de l’attribution du rôle.`,
          ephemeral: true,
        });
      }
    }

    if (type === 'image') {
      await interaction.deferReply({ ephemeral: true });

      const { image, text } = Captcha.create(
        { color: '#4b9d6e' },
        {},
        { amount: 5, blur: 25 },
        { rotate: 15, skew: true },
      );

      try {
        await interaction.user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('🔐 Vérification par Captcha')
              .setDescription(
                [
                  '➡️ Saisissez le texte vert ci-dessous.',
                  '⏳ Temps : 1 minute, 3 tentatives max.',
                  '⚠️ Échec : réessayez dans 5 min.',
                ].join('\n'),
              )
              .setColor(Colors.Blurple)
              .setImage('attachment://captcha.jpeg')
              .setTimestamp(),
          ],
          files: [new AttachmentBuilder(image, { name: 'captcha.jpeg' })],
        });

        duringAuthentication.add(interaction.user.id);
        await interaction.followUp({
          content: `${inlineCode('📩')} Consultez vos DM.`,
          ephemeral: true,
        });

        if (!interaction.user.dmChannel) {
          duringAuthentication.delete(interaction.user.id);
          return interaction.followUp({
            content: `${inlineCode('❌')} DM non disponibles.`,
            ephemeral: true,
          });
        }

        const collector = interaction.user.dmChannel.createMessageCollector({
          filter: (msg) => msg.author.id === interaction.user.id,
          time: Duration.toMS('1m'),
          max: 3,
        });

        collector.on('collect', async (msg) => {
          if (msg.content !== text) return;

          try {
            await roles.add(roleId, 'Vérification via captcha');
            await interaction.user.send(`${inlineCode('✅')} Vérification réussie !`);
          } catch {
            await interaction.user.send(`${inlineCode('❌')} Échec de l’attribution.`);
          }
          collector.stop();
        });

        collector.on('end', (collected) => {
          if (collected.size >= 3) {
            interaction.user.send(`${inlineCode('❌')} 3 échecs. Réessayez dans 5 min.`);
            setTimeout(() => duringAuthentication.delete(interaction.user.id), Duration.toMS('5m'));
          } else {
            duringAuthentication.delete(interaction.user.id);
          }
        });
      } catch {
        duringAuthentication.delete(interaction.user.id);
        await interaction.followUp({
          content: `${inlineCode('❌')} Activez vos DM pour le captcha.`,
          ephemeral: true,
        });
      }
    }
  },
);

export default [verifyCommand, verifyButton];
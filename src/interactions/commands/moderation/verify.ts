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
    description: 'Créer un panneau de vérification utilisant des rôles',
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
    defaultMemberPermissions: [
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
    ],
    dmPermission: false,
  },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;
    const role = interaction.options.getRole('role', true);
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageRoles,
      )
    )
      return interaction.reply({
        content: permissionField(permToText('ManageRoles'), {
          label: 'Le bot n’a pas les permissions nécessaires',
        }),
        ephemeral: true,
      });
    if (role.managed || role.id === interaction.guild.roles.everyone.id)
      return interaction.reply({
        content: `${inlineCode('❌')} Ce rôle ne peut pas être utilisé pour la vérification`,
        ephemeral: true,
      });
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.member.roles.highest.position < role.position
    )
      return interaction.reply({
        content: `${inlineCode(
          '❌',
        )} Vous ne pouvez pas utiliser un rôle supérieur au vôtre pour la vérification`,
        ephemeral: true,
      });
    if (!role.editable)
      return interaction.reply({
        content: `${inlineCode(
          '❌',
        )} Vous ne pouvez pas utiliser un rôle supérieur à celui du bot pour la vérification`,
        ephemeral: true,
      });

    const verifyType: VerifyType = interaction.options.getString(
      'type',
      true,
    ) as VerifyType;

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${inlineCode('✅')} Vérification : ${verifyTypes[verifyType]}`)
          .setDescription(
            interaction.options.getString('description')?.replace('  ', '\n') ||
              null,
          )
          .setColor(interaction.options.getNumber('color') ?? Colors.Green)
          .setImage(interaction.options.getAttachment('image')?.url || null)
          .setFields({
            name: 'Rôle à attribuer',
            value: role.toString(),
          }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId(`kaori-js:verify-${verifyType}`)
            .setLabel('Vérifier')
            .setStyle(ButtonStyle.Success),
        ),
      ],
    });
  },
);

const verifyButton = new Button(
  {
    customId: /^kaori-js:verify-(button|image)$/,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const roleId =
      interaction.message.embeds[0]?.fields[0]?.value?.match(
        /(?<=<@&)\d+(?=>)/,
      )?.[0];
    const roles = interaction.member.roles;

    if (duringAuthentication.has(interaction.user.id))
      return interaction.reply({
        content: `${inlineCode(
          '❌',
        )} Vous êtes actuellement en cours de vérification. Vous ne pouvez pas commencer une nouvelle vérification tant que la précédente n’est pas terminée.`,
        ephemeral: true,
      });
    if (!roleId || !(roles instanceof GuildMemberRoleManager))
      return interaction.reply({
        content: `${inlineCode('❌')} Un problème est survenu lors de la vérification.`,
        ephemeral: true,
      });
    if (roles.cache.has(roleId))
      return interaction.reply({
        content: `${inlineCode('✅')} Vous êtes déjà vérifié.`,
        ephemeral: true,
      });

    if (interaction.customId === 'kaori-js:verify-button') {
      roles
        .add(roleId, 'Vérification')
        .then(() =>
          interaction.reply({
            content: `${inlineCode('✅')} Vérification réussie !`,
            ephemeral: true,
          }),
        )
        .catch(() =>
          interaction.reply({
            content: `${inlineCode(
              '❌',
            )} Échec de l’attribution du rôle. Veuillez contacter un administrateur du serveur.`,
            ephemeral: true,
          }),
        );
    }

    if (interaction.customId === 'kaori-js:verify-image') {
      await interaction.deferReply({ ephemeral: true });

      const { image, text } = Captcha.create(
        { color: '#4b9d6e' },
        {} ,
        { amount: 5, blur: 25 },
        { rotate: 15, skew: true },
      );

      interaction.user
        .send({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                [
                  'Veuillez envoyer le texte vert affiché dans l’image ci-dessous à ce DM.',
                  '> ⚠️ Si le temps passe ou si vous faites plusieurs erreurs, une nouvelle vérification sera nécessaire.',
                ].join('\n'),
              )
              .setColor(Colors.Blurple)
              .setImage('attachment://kaori-js-captcha.jpeg')
              .setFooter({
                text: 'Kaori ne demande jamais de saisie de mot de passe ni de scan de QR code.',
              }),
          ],
          files: [
            new AttachmentBuilder(image, { name: 'kaori-js-captcha.jpeg' }),
          ],
        })
        .then(() => {
          duringAuthentication.add(interaction.user.id);
          interaction.followUp(
            `${inlineCode('📨')} Continuez la vérification en DM.`,
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
              .add(roleId, 'Vérification')
              .then(() =>
                interaction.user.send(
                  `${inlineCode('✅')} Vérification réussie !`,
                ),
              )
              .catch(() =>
                interaction.user.send(
                  `${inlineCode(
                    '❌',
                  )} Échec de l’attribution du rôle. Veuillez contacter un administrateur du serveur.`,
                ),
              )
              .finally(() => collector.stop());
          });

          collector.on('end', (collection) => {
            if (collection.size === 3) {
              interaction.user.send(
                `${inlineCode(
                  '❌',
                )} Vous avez échoué à la vérification après 3 tentatives. Vous pourrez réessayer dans ${inlineCode(
                  '5 minutes',
                )}.`,
              );
              setTimeout(
                () => duringAuthentication.delete(interaction.user.id),
                Duration.toMS('5m'),
              );
            } else duringAuthentication.delete(interaction.user.id);
          });
        })
        .catch(() => {
          interaction.followUp({
            content: `${inlineCode(
              '❌',
            )} Vous devez activer les paramètres de DM pour recevoir les messages du bot.`,
            ephemeral: true,
          });
        });
    }
  },
);

export default [verifyCommand, verifyButton];
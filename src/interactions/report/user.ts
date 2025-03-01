import { Modal, UserContext } from '@akki256/discord-interaction';
import { dashboard } from '@const/links';
import { ReportConfig } from '@models';
import { scheduleField, userField } from '@modules/fields';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  hyperlink,
  roleMention,
} from 'discord.js';

const userContext = new UserContext(
  {
    name: 'Signaler un utilisateur',
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const setting = await ReportConfig.findOne({
      guildId: interaction.guild.id,
    });

    if (!setting?.channel) {
      if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: `\`❌\` Pour utiliser cette fonctionnalité, veuillez configurer ${hyperlink('un salon pour recevoir les signalements', `<${dashboard}/guilds/${interaction.guild.id}/report>`)} sur le tableau de bord.`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: '`❌` Cette fonctionnalité est actuellement indisponible. Veuillez contacter l’administrateur du serveur.',
        ephemeral: true,
      });
    }

    const user = interaction.targetUser;

    if (user.system || user.equals(interaction.client.user)) {
      return interaction.reply({
        content: '`❌` Vous ne pouvez pas signaler cet utilisateur.',
        ephemeral: true,
      });
    }

    if (user.equals(interaction.user)) {
      return interaction.reply({
        content: '`❌` Vous essayez de vous signaler vous-même.',
        ephemeral: true,
      });
    }

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:userReportModal')
        .setTitle('Signaler un utilisateur')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId(interaction.targetId)
              .setLabel('Détails')
              .setPlaceholder(
                'Les signalements soumis ici sont visibles par les administrateurs.',
              )
              .setMaxLength(1500)
              .setStyle(TextInputStyle.Paragraph),
          ),
        ),
    );
  },
);

const userReportModal = new Modal(
  {
    customId: 'kaori:userReportModal',
  },
  async (interaction) => {
    if (!(interaction.inCachedGuild() && interaction.channel)) return;

    const setting = await ReportConfig.findOne({
      guildId: interaction.guild.id,
    });
    if (!setting?.channel) {
      return interaction.reply({
        content: '`❌` Une erreur est survenue lors de l’envoi du signalement.',
        ephemeral: true,
      });
    }

    const target = await interaction.client.users
      .fetch(interaction.components[0].components[0].customId)
      .catch(() => null);
    const channel = await interaction.guild.channels
      .fetch(setting.channel)
      .catch(() => null);

    if (!(target && channel?.isTextBased()))
      return interaction.reply({
        content: '`❌` Une erreur est survenue lors de l’envoi du signalement.',
        ephemeral: true,
      });

    channel
      .send({
        content: setting.mention?.enabled
          ? setting.mention.roles.map(roleMention).join()
          : undefined,
        embeds: [
          new EmbedBuilder()
            .setTitle('`📢` Signalement d’utilisateur')
            .setDescription(
              [
                userField(target, {
                  emoji: 'edit',
                  color: 'gray',
                  label: 'Utilisateur signalé',
                }),
                scheduleField(target.createdAt, {
                  label: 'Date de création du compte',
                }),
                '',
                userField(interaction.user, {
                  color: 'blurple',
                  label: 'Signaleur',
                }),
              ].join('\n'),
            )
            .setColor(Colors.DarkButNotBlack)
            .setThumbnail(target.displayAvatarURL())
            .setFields({
              name: 'Raison',
              value: interaction.components[0].components[0].value,
            }),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:report-consider')
              .setLabel('Prendre des mesures')
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      })
      .then((message) => {
        interaction.reply({
          content: '`✅` **Merci pour votre signalement !** Il a été envoyé aux administrateurs du serveur.',
          ephemeral: true,
        });
        message
          .startThread({ name: `Signalement de ${target.username}` })
          .catch(() => {});
      })
      .catch(() =>
        interaction.reply({
          content: '`❌` Une erreur est survenue lors de l’envoi du signalement.',
          ephemeral: true,
        }),
      );
  },
);

export default [userContext, userReportModal];
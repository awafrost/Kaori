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
    name: 'Report User',
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
          content: `\`❌\` To use this feature, please configure ${hyperlink('a channel to receive reports', `<${dashboard}/guilds/${interaction.guild.id}/report>`)} on the dashboard.`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: '`❌` This feature is currently unavailable. Please contact the server administrator.',
        ephemeral: true,
      });
    }

    const user = interaction.targetUser;

    if (user.system || user.equals(interaction.client.user)) {
      return interaction.reply({
        content: '`❌` You cannot report this user.',
        ephemeral: true,
      });
    }

    if (user.equals(interaction.user)) {
      return interaction.reply({
        content: '`❌` You are attempting to report yourself.',
        ephemeral: true,
      });
    }

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:userReportModal')
        .setTitle('Report User')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId(interaction.targetId)
              .setLabel('Details')
              .setPlaceholder(
                'Reports submitted here are visible by admins.',
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
        content: '`❌` An error occurred while sending the report.',
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
        content: '`❌` An error occurred while sending the report.',
        ephemeral: true,
      });

    channel
      .send({
        content: setting.mention?.enabled
          ? setting.mention.roles.map(roleMention).join()
          : undefined,
        embeds: [
          new EmbedBuilder()
            .setTitle('`📢` User Report')
            .setDescription(
              [
                userField(target, {
                  emoji: 'edit',
                  color: 'gray',
                  label: 'Reported User',
                }),
                scheduleField(target.createdAt, {
                  label: 'Account Creation Date',
                }),
                '',
                userField(interaction.user, {
                  color: 'blurple',
                  label: 'Reporter',
                }),
              ].join('\n'),
            )
            .setColor(Colors.DarkButNotBlack)
            .setThumbnail(target.displayAvatarURL())
            .setFields({
              name: 'Reason',
              value: interaction.components[0].components[0].value,
            }),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:report-consider')
              .setLabel('Take Action')
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      })
      .then((message) => {
        interaction.reply({
          content: '`✅` **Thank you for your report!** It has been sent to the server administrators.',
          ephemeral: true,
        });
        message
          .startThread({ name: `Report on ${target.username}` })
          .catch(() => {});
      })
      .catch(() =>
        interaction.reply({
          content: '`❌` An error occurred while sending the report.',
          ephemeral: true,
        }),
      );
  },
);

export default [userContext, userReportModal];
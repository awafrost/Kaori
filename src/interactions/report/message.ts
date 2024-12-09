import { MessageContext, Modal } from '@akki256/discord-interaction';
import { gray } from '@const/emojis';
import { dashboard } from '@const/links';
import { ReportConfig } from '@models';
import { countField, scheduleField, userField } from '@modules/fields';
import { formatEmoji } from '@modules/util';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  Message,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  escapeSpoiler,
  hyperlink,
  roleMention,
} from 'discord.js';

const messageContext = new MessageContext(
  {
    name: 'Report Message',
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
          content: `\`❌\` To use this feature, set up a report receiving channel via the dashboard: ${hyperlink('Set a channel', `<${dashboard}/guilds/${interaction.guild.id}/report>`)}`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: '`❌` This feature is not currently available. Please contact a server admin.',
        ephemeral: true,
      });
    }

    const message = interaction.targetMessage;
    const user = message.author;

    if (user.system || message.webhookId) {
      return interaction.reply({
        content: '`❌` You cannot report system messages or webhook messages.',
        ephemeral: true,
      });
    }

    if (user.equals(interaction.user)) {
      return interaction.reply({
        content: '`❌` You cannot report yourself.',
        ephemeral: true,
      });
    }
    if (user.equals(interaction.client.user)) {
      return interaction.reply({
        content: `\`❌\` You cannot report ${interaction.client.user.username}.`,
        ephemeral: true,
      });
    }

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:messageReportModal')
        .setTitle('Report Message')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId(interaction.targetId)
              .setLabel('Details')
              .setPlaceholder(
                'Your report will only be visible to admins.',
              )
              .setMaxLength(1500)
              .setStyle(TextInputStyle.Paragraph),
          ),
        ),
    );
  },
);

const messageReportModal = new Modal(
  {
    customId: 'kaori:messageReportModal',
  },
  async (interaction) => {
    if (!(interaction.inCachedGuild() && interaction.channel)) return;

    const setting = await ReportConfig.findOne({
      guildId: interaction.guild.id,
    });
    if (!setting?.channel) {
      return interaction.reply({
        content: '`❌` An error occurred while submitting your report.',
        ephemeral: true,
      });
    }

    const message = await interaction.channel.messages
      .fetch(interaction.components[0].components[0].customId)
      .catch(() => null);
    const channel = await interaction.guild.channels
      .fetch(setting.channel)
      .catch(() => null);

    if (!(message instanceof Message)) {
      return interaction.reply({
        content:
          '`❌` The message you tried to report was deleted or is inaccessible by the bot.',
        ephemeral: true,
      });
    }
    if (!channel?.isTextBased()) {
      return interaction.reply({
        content: '`❌` An error occurred while submitting your report.',
        ephemeral: true,
      });
    }

    channel
      .send({
        content: setting.mention.enabled
          ? setting.mention.roles.map(roleMention).join()
          : undefined,
        embeds: [
          new EmbedBuilder()
            .setTitle('`📢` Message Report')
            .setDescription(
              [
                userField(message.author, { label: 'Sender' }),
                `${formatEmoji(gray.channel)} **Message:** ${message.url}`,
                countField(message.attachments.size, {
                  emoji: 'link',
                  color: 'gray',
                  label: 'Attached Files',
                }),
                scheduleField(message.createdAt, { label: 'Sent At' }),
                '',
                userField(interaction.user, {
                  color: 'blurple',
                  label: 'Reporter',
                }),
              ].join('\n'),
            )
            .setColor(Colors.DarkButNotBlack)
            .setThumbnail(message.author.displayAvatarURL())
            .setFields(
              {
                name: 'Message Content',
                value: escapeSpoiler(message.content || 'None'),
              },
              {
                name: 'Reason',
                value: interaction.components[0].components[0].value,
              },
            ),
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
      .then((msg) => {
        interaction.reply({
          content: '`✅` **Thank you for your report!** It has been sent to the server admins.',
          ephemeral: true,
        });
        msg
          .startThread({ name: `Report for ${message.author.username}` })
          .catch(() => {});
      })
      .catch(() =>
        interaction.reply({
          content: '`❌` An error occurred while submitting your report.',
          ephemeral: true,
        }),
      );
  },
);

export default [messageContext, messageReportModal];
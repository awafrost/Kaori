import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { channelField, scheduleField, userField } from '@modules/fields';
import { createAttachment, getSendableChannel } from '@modules/util';
import { Colors, EmbedBuilder, Events } from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.MessageUpdate,
  async execute(oldMessage, { content, attachments }) {
    if (!oldMessage.inGuild() || oldMessage.author.bot) return; // Check if the message author is a bot
    const { messageEdit: setting } =
      (await EventLogConfig.findOne({ guildId: oldMessage.guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;
    const channel = await getSendableChannel(
      oldMessage.guild,
      setting.channel,
    ).catch(() => {
      EventLogConfig.updateOne(
        { guildId: oldMessage.guild.id },
        { $set: { messageEdit: { enabled: false, channel: null } } },
      );
    });
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setTitle('`💬` Message Edited')
      .setURL(oldMessage.url)
      .setDescription(
        [
          channelField(oldMessage.channel),
          userField(oldMessage.author, { label: 'Sender' }),
          scheduleField(oldMessage.createdAt, { label: 'Sent Time' }),
        ].join('\n'),
      )
      .setColor(Colors.Yellow)
      .setThumbnail(oldMessage.author.displayAvatarURL())
      .setTimestamp();
    const contentChanged = oldMessage.content !== content;
    if (contentChanged) {
      embed.addFields(
        { name: 'Before Change', value: oldMessage.content ?? 'None' },
        { name: 'After Change', value: content ?? 'None' },
      );
    }

    const attachment = await createAttachment(
      oldMessage.attachments.difference(attachments),
    );
    if (attachment) channel.send({ embeds: [embed], files: [attachment] });
    if (contentChanged && !attachment) channel.send({ embeds: [embed] });
  },
});
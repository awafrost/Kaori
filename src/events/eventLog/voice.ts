import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { channelField, userField } from '@modules/fields';
import { Colors, EmbedBuilder, Events } from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    if (!newState.member) return;

    const config = await EventLogConfig.findOne({ guildId: oldState.guild.id });
    if (!config?.voice.enabled || !config?.voice.channel) return;

    const channel = await newState.guild.channels
      .fetch(config.voice.channel)
      .catch(() => null);
    if (!channel?.isTextBased()) return;

    if (
      oldState.channel &&
      newState.channel &&
      !oldState.channel.equals(newState.channel)
    )
      channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('`🔊` Channel Moved')
            .setDescription(
              [
                userField(newState.member.user, { label: 'Member' }),
                channelField(oldState.channel, { label: 'Previous Channel' }),
                channelField(newState.channel, { label: 'New Channel' }),
              ].join('\n'),
            )
            .setColor(Colors.Yellow)
            .setThumbnail(newState.member.displayAvatarURL())
            .setTimestamp(),
        ],
      });
    else if (!oldState.channel && newState.channel)
      channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('`🔊` Joined Channel')
            .setDescription(
              [
                userField(newState.member.user, { label: 'Member' }),
                channelField(newState.channel, { label: 'Channel' }),
              ].join('\n'),
            )
            .setColor(Colors.Green)
            .setThumbnail(newState.member.displayAvatarURL())
            .setTimestamp(),
        ],
      });
    else if (oldState.channel && !newState.channel)
      channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('`🔊` Left Channel')
            .setDescription(
              [
                userField(newState.member.user, { label: 'Member' }),
                channelField(oldState.channel, { label: 'Channel' }),
              ].join('\n'),
            )
            .setColor(Colors.Red)
            .setThumbnail(newState.member.displayAvatarURL())
            .setTimestamp(),
        ],
      });
  },
});
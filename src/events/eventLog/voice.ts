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

    const embed = new EmbedBuilder()
      .setThumbnail(newState.member.displayAvatarURL())
      .setTimestamp();

    // Log channel changes
    if (!oldState.channel && newState.channel) {
      embed
        .setTitle('🔊 Joined Channel')
        .setDescription(
          [
            userField(newState.member.user, { label: 'Member' }),
            channelField(newState.channel, { label: 'Channel' }),
          ].join('\n')
        )
        .setColor(Colors.Green);
    } else if (oldState.channel && !newState.channel) {
      embed
        .setTitle('🔊 Left Channel')
        .setDescription(
          [
            userField(newState.member.user, { label: 'Member' }),
            channelField(oldState.channel, { label: 'Channel' }),
          ].join('\n')
        )
        .setColor(Colors.Red);
    } else if (oldState.channel && newState.channel && !oldState.channel.equals(newState.channel)) {
      embed
        .setTitle('🔊 Channel Moved')
        .setDescription(
          [
            userField(newState.member.user, { label: 'Member' }),
            channelField(oldState.channel, { label: 'Previous Channel' }),
            channelField(newState.channel, { label: 'New Channel' }),
          ].join('\n')
        )
        .setColor(Colors.Yellow);
    }

    // Log mute/unmute events
    if (oldState.selfMute !== newState.selfMute) {
      embed
        .setTitle(newState.selfMute ? '🔇 Self-Muted' : '🔊 Self-Unmuted')
        .setDescription(userField(newState.member.user, { label: 'Member' }))
        .setColor(newState.selfMute ? Colors.DarkRed : Colors.DarkGreen);
    } else if (oldState.mute !== newState.mute) {
      embed
        .setTitle(newState.mute ? '🔇 Muted by Staff' : '🔊 Unmuted by Staff')
        .setDescription(userField(newState.member.user, { label: 'Member' }))
        .setColor(newState.mute ? Colors.Red : Colors.Green);
    }

    // Log deafen/undeafen events
    if (oldState.selfDeaf !== newState.selfDeaf) {
      embed
        .setTitle(newState.selfDeaf ? '🔇 Self-Deafened' : '🔊 Self-Undeafened')
        .setDescription(userField(newState.member.user, { label: 'Member' }))
        .setColor(newState.selfDeaf ? Colors.DarkRed : Colors.DarkGreen);
    } else if (oldState.deaf !== newState.deaf) {
      embed
        .setTitle(newState.deaf ? '🔇 Deafened by Staff' : '🔊 Undeafened by Staff')
        .setDescription(userField(newState.member.user, { label: 'Member' }))
        .setColor(newState.deaf ? Colors.Red : Colors.Green);
    }

    // Send the embed if it has been modified
    if (embed.data.title) {
      channel.send({ embeds: [embed] });
    }
  },
});
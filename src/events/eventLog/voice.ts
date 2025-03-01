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

    // Détection des changements de canal vocal
    if (!oldState.channel && newState.channel) {
      embed
        .setTitle('🔊 Connexion au salon vocal')
        .setDescription(
          [
            userField(newState.member.user, { label: 'Membre' }),
            channelField(newState.channel, { label: 'Salon' }),
          ].join('\n')
        )
        .setColor(Colors.Green);
    } else if (oldState.channel && !newState.channel) {
      embed
        .setTitle('🔴 Déconnexion du salon vocal')
        .setDescription(
          [
            userField(newState.member.user, { label: 'Membre' }),
            channelField(oldState.channel, { label: 'Salon' }),
          ].join('\n')
        )
        .setColor(Colors.Red);
    } else if (oldState.channel && newState.channel && !oldState.channel.equals(newState.channel)) {
      embed
        .setTitle('🔄 Changement de salon vocal')
        .setDescription(
          [
            userField(newState.member.user, { label: 'Membre' }),
            channelField(oldState.channel, { label: 'Ancien salon' }),
            channelField(newState.channel, { label: 'Nouveau salon' }),
          ].join('\n')
        )
        .setColor(Colors.Yellow);
    }

    // Détection des changements de micro
    if (oldState.selfMute !== newState.selfMute) {
      embed
        .setTitle(newState.selfMute ? '🔇 Micro coupé (auto)' : '🔊 Micro réactivé (auto)')
        .setDescription(userField(newState.member.user, { label: 'Membre' }))
        .setColor(newState.selfMute ? Colors.DarkRed : Colors.DarkGreen);
    } else if (oldState.mute !== newState.mute) {
      embed
        .setTitle(newState.mute ? '🔇 Micro coupé par un modérateur' : '🔊 Micro réactivé par un modérateur')
        .setDescription(userField(newState.member.user, { label: 'Membre' }))
        .setColor(newState.mute ? Colors.Red : Colors.Green);
    }

    // Détection des changements de son
    if (oldState.selfDeaf !== newState.selfDeaf) {
      embed
        .setTitle(newState.selfDeaf ? '🔇 Son coupé (auto)' : '🔊 Son réactivé (auto)')
        .setDescription(userField(newState.member.user, { label: 'Membre' }))
        .setColor(newState.selfDeaf ? Colors.DarkRed : Colors.DarkGreen);
    } else if (oldState.deaf !== newState.deaf) {
      embed
        .setTitle(newState.deaf ? '🔇 Son coupé par un modérateur' : '🔊 Son réactivé par un modérateur')
        .setDescription(userField(newState.member.user, { label: 'Membre' }))
        .setColor(newState.deaf ? Colors.Red : Colors.Green);
    }

    // Vérification et envoi du message
    if (embed.data.title) {
      channel.send({ embeds: [embed] });
    }
  },
});
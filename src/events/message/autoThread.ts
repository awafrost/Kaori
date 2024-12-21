import { AutoCreateThreadConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { Events } from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.MessageCreate,
  async execute(message) {
    if (!message.inGuild()) return;

    const setting = await AutoCreateThreadConfig.findOne({
      guildId: message.guild.id,
    });

    if (!setting?.enabled) return;
    if (!setting.channels.includes(message.channel.id)) return;

    // Ajouter des réactions au message
    await message.react('👍'); // Réaction 1
    await message.react('👎'); // Réaction 2

    // Créer un thread pour le message
    await message.startThread({
      name: `${message.author.username}'s Thread`,
      reason: 'auto thread create',
    });
  },
});
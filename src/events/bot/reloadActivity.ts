import { DiscordEventBuilder } from '@modules/events';
import { ActivityType, type Client, Events, PermissionFlagsBits } from 'discord.js';

const onGuildCreate = new DiscordEventBuilder({
  type: Events.GuildCreate,
  execute: (guild) => setActivity(guild.client),
});

const onGuildDelete = new DiscordEventBuilder({
  type: Events.GuildDelete,
  execute: (guild) => setActivity(guild.client),
});

async function setActivity(client: Client<true>) {
  // Calcul sécurisé du nombre total de membres
  const totalMembers = client.guilds.cache.reduce((acc, guild) => {
    return acc + (guild.memberCount ?? 0); // Utilise 0 si memberCount est undefined
  }, 0);

  // Calcul sécurisé du nombre total de salons accessibles
  const totalChannels = client.channels.cache.filter(channel => {
    if (!channel.isTextBased()) return false;
    if ('guild' in channel) {
      try {
        return channel.permissionsFor(client.user)?.has(PermissionFlagsBits.ViewChannel) ?? false;
      } catch {
        return false; // Ignore les channels problématiques
      }
    }
    return false;
  }).size;

  const activities = [
    { name: `${client.guilds.cache.size} serveurs`, type: ActivityType.Watching },
    { 
      name: `${(await client.application?.fetch())?.approximateGuildCount ?? client.guilds.cache.size} serveurs`, 
      type: ActivityType.Competing 
    },
    { name: `${totalMembers.toLocaleString()} membres au total`, type: ActivityType.Watching },
    { name: `${totalChannels} salons accessibles`, type: ActivityType.Listening },
  ];

  let currentIndex = 0;
  if (client.user) {
    client.user.setActivity(activities[currentIndex]);
  }

  setInterval(() => {
    currentIndex = (currentIndex + 1) % activities.length;
    if (client.user) {
      client.user.setActivity(activities[currentIndex]);
    }
  }, 30_000);
}

export default [onGuildCreate, onGuildDelete];
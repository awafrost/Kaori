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
  const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

  // Vérification du type de channel et gestion des permissions
  const totalChannels = client.channels.cache.filter(channel => {
    if (!channel.isTextBased()) return false;
    // Vérifier si c'est un channel de guilde avant d'utiliser permissionsFor
    if ('guild' in channel) {
      return channel.permissionsFor(client.user)?.has(PermissionFlagsBits.ViewChannel) ?? false;
    }
    return false; // Exclure les DM channels
  }).size;

  const activities = [
    { name: `${client.guilds.cache.size} serveurs`, type: ActivityType.Watching },
    { 
      name: `${(await client.application?.fetch())?.approximateGuildCount ?? client.guilds.cache.size} serveurs`, 
      type: ActivityType.Competing 
    },
    { name: `${totalMembers} membres au total`, type: ActivityType.Watching },
    { name: `${totalChannels} salons accessibles`, type: ActivityType.Listening },
    { name: 'les messages des membres', type: ActivityType.Watching },
    { name: 'la communauté s’agrandir', type: ActivityType.Watching },
    { name: 'les commandes en cours', type: ActivityType.Playing },
    { name: 'les nouveaux messages', type: ActivityType.Watching },
    { name: 'les serveurs évoluer', type: ActivityType.Watching },
    { name: 'un Discord vivant', type: ActivityType.Streaming },
  ];

  let currentIndex = 0;
  client.user?.setActivity(activities[currentIndex]);

  setInterval(() => {
    currentIndex = (currentIndex + 1) % activities.length;
    client.user?.setActivity(activities[currentIndex]);
  }, 30_000);
}

export default [onGuildCreate, onGuildDelete];
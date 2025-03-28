import { DiscordEventBuilder } from '@modules/events';
import { ActivityType, type Client, Events } from 'discord.js';

const onGuildCreate = new DiscordEventBuilder({
  type: Events.GuildCreate,
  execute: (guild) => setActivity(guild.client),
});

const onGuildDelete = new DiscordEventBuilder({
  type: Events.GuildDelete,
  execute: (guild) => setActivity(guild.client),
});

async function setActivity(client: Client<true>) {
  // Calcul du nombre total de membres sur tous les serveurs
  const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

  // Calcul du nombre total de salons accessibles (ceux où le bot a des permissions)
  const totalChannels = client.channels.cache.filter(channel => 
    channel.isTextBased() && channel.permissionsFor(client.user)?.has('ViewChannel')
  ).size;

  // Liste de statuts d’activité avec des stats précises
  const activities = [
    {
      name: `${client.guilds.cache.size} serveurs`,
      type: ActivityType.Watching, // "Regarde X serveurs"
    },
    {
      name: `${(await client.application?.fetch())?.approximateGuildCount ?? client.guilds.cache.size} serveurs`,
      type: ActivityType.Competing, // "En compétition sur X serveurs"
    },
    {
      name: `${totalMembers} membres au total`,
      type: ActivityType.Watching, // "Regarde X membres au total"
    },
    {
      name: `${totalChannels} salons accessibles`,
      type: ActivityType.Listening, // "Écoute X salons accessibles"
    },
    {
      name: 'les messages des membres',
      type: ActivityType.Watching, // "Regarde les messages des membres"
    },
    {
      name: 'la communauté s’agrandir',
      type: ActivityType.Watching, // "Regarde la communauté s’agrandir"
    },
    {
      name: 'les commandes en cours',
      type: ActivityType.Playing, // "Joue avec les commandes en cours"
    },
    {
      name: 'les nouveaux messages',
      type: ActivityType.Watching, // "Regarde les nouveaux messages"
    },
    {
      name: 'les serveurs évoluer',
      type: ActivityType.Watching, // "Regarde les serveurs évoluer"
    },
    {
      name: 'un Discord vivant',
      type: ActivityType.Streaming, // "Streame un Discord vivant"
    },
  ];

  // Définir une activité initiale immédiatement
  let currentIndex = 0;
  client.user?.setActivity(activities[currentIndex]);

  // Changer l’activité toutes les 30 secondes
  setInterval(() => {
    currentIndex = (currentIndex + 1) % activities.length; // Boucle sur les statuts
    client.user?.setActivity(activities[currentIndex]);
  }, 30_000); // 30 secondes
}

export default [onGuildCreate, onGuildDelete];
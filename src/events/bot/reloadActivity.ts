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
  // Liste de 10 statuts d’activité
  const activities = [
    {
      name: `${(await client.application?.fetch())?.approximateGuildCount} serveurs`,
      type: ActivityType.Competing, // "En compétition sur X serveurs"
    },
    {
      name: `${client.guilds.cache.size} serveurs`,
      type: ActivityType.Watching, // "Regarde X guildes"
    },
    {
      name: `${client.users.cache.size} utilisateurs`,
      type: ActivityType.Watching, // "Regarde X utilisateurs"
    },
    {
      name: 'les messages du serveur',
      type: ActivityType.Watching, // "Regarde les messages du serveur"
    },
    {
      name: 'les étoiles dans le ciel',
      type: ActivityType.Watching, // "Regarde les étoiles dans le ciel"
    },
    {
      name: `${client.channels.cache.size} salons`,
      type: ActivityType.Watching, // "Regarde X salons"
    },
    {
      name: 'les activités des membres',
      type: ActivityType.Watching, // "Regarde les activités des membres"
    },
    {
      name: 'les nouveaux arrivants',
      type: ActivityType.Watching, // "Regarde les nouveaux arrivants"
    },
    {
      name: 'les bots concurrents',
      type: ActivityType.Watching, // "Regarde les bots concurrents"
    },
    {
      name: 'l’avenir de Discord',
      type: ActivityType.Watching, // "Regarde l’avenir de Discord"
    },
  ];

  // Définir une activité initiale immédiatement
  let currentIndex = 0;
  client.user.setActivity(activities[currentIndex]);

  // Changer l’activité toutes les 30 secondes
  setInterval(() => {
    currentIndex = (currentIndex + 1) % activities.length; // Boucle sur les statuts
    client.user.setActivity(activities[currentIndex]);
  }, 30_000); // 30 secondes
}

export default [onGuildCreate, onGuildDelete];
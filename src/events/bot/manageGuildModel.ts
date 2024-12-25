import { Guild as DiscordGuild, TextChannel, EmbedBuilder, Events } from 'discord.js';
import { DiscordEventBuilder } from '@modules/events';

// ID du salon où les logs seront envoyés
const LOG_CHANNEL_ID = '1256686169282838640';

// Gestion des événements GuildCreate et GuildDelete
const onGuildCreate = new DiscordEventBuilder({
  type: Events.GuildCreate,
  async execute(guild: DiscordGuild) {
    await sendLogEmbed(guild, 'added');
  },
});

const onGuildDelete = new DiscordEventBuilder({
  type: Events.GuildDelete,
  async execute(guild: DiscordGuild) {
    await sendLogEmbed(guild, 'removed');
  },
});

// Fonction pour envoyer un embed dans le salon de logs
async function sendLogEmbed(guild: DiscordGuild, action: 'added' | 'removed') {
  const timestamp = new Date();
  const embed = new EmbedBuilder()
    .setTitle(`Bot ${action === 'added' ? 'Added' : 'Removed'}`)
    .setColor(action === 'added' ? 0x00ff00 : 0xff0000)
    .addFields(
      { name: 'Server Name', value: guild.name, inline: true },
      { name: 'Server ID', value: guild.id, inline: true },
      { name: 'Time', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: false }
    )
    .setFooter({ text: 'Bot Logs' });

  // Vérification et récupération du salon
  const channel = await guild.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.warn(
      `Log channel not found or invalid. Please check LOG_CHANNEL_ID: ${LOG_CHANNEL_ID}`
    );
    return;
  }

  // Envoi de l'embed dans le salon
  await (channel as TextChannel).send({ embeds: [embed] }).catch((err) => {
    console.error(`Failed to send log embed for guild ${guild.id}: ${err}`);
  });
}

export default [onGuildCreate, onGuildDelete];
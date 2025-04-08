import { Guild } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { Events, EmbedBuilder, Colors, ChannelType, TextChannel } from 'discord.js';

const GuildCache = new Set<string>();
const LOG_CHANNEL_ID = '1351312330759344158'; // Remplacez par l'ID réel

const onGuildCreate = new DiscordEventBuilder({
  type: Events.GuildCreate,
  async execute(guild) {
    console.log(`[GuildCreate] Bot ajouté au serveur : ${guild.id} (${guild.name})`);
    await createGuild(guild.id);

    let invite;
    try {
      const botMember = guild.members.me;
      if (!botMember) throw new Error('Bot member not found');

      const channel = guild.channels.cache.find(
        (ch): ch is TextChannel => 
          ch.type === ChannelType.GuildText && 
          ch.permissionsFor(botMember)?.has('CreateInstantInvite') === true
      );

      if (channel) {
        invite = await channel.createInvite({
          maxAge: 0,
          reason: 'Invitation automatique pour les logs du bot'
        });
      } else {
        console.log(`[GuildCreate] Aucun canal textuel trouvé pour créer une invitation dans ${guild.name}`);
      }
    } catch (error) {
      console.error(`[GuildCreate] Erreur lors de la création de l'invitation pour ${guild.name}:`, error);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('Nouveau serveur rejoint')
      .setColor(Colors.Green)
      .addFields(
        { name: 'Nom', value: guild.name || 'Inconnu', inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Membres', value: guild.memberCount?.toString() || 'Inconnu', inline: true },
        { name: 'Propriétaire', value: guild.ownerId ? `<@${guild.ownerId}> (${guild.ownerId})` : 'Inconnu', inline: true },
        { name: 'Invitation', value: invite ? `[Lien](${invite.url})` : 'Non générée', inline: true }
      )
      .setTimestamp(new Date()) // Ajoute le timestamp Discord
      .setThumbnail(guild.iconURL());

    const logChannel = guild.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel?.type === ChannelType.GuildText) {
      try {
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`[GuildCreate] Log envoyé pour le serveur ${guild.id}`);
      } catch (error) {
        console.error(`[GuildCreate] Erreur lors de l'envoi du log pour ${guild.id}:`, error);
      }
    } else {
      console.error(`[GuildCreate] Canal de logs (${LOG_CHANNEL_ID}) invalide ou non trouvé`);
    }
  },
});

const onMessageCreate = new DiscordEventBuilder({
  type: Events.MessageCreate,
  async execute(message) {
    if (!message.inGuild()) return;
    await createGuild(message.guild.id);
  },
});

const onGuildDelete = new DiscordEventBuilder({
  type: Events.GuildDelete,
  async execute(guild) {
    console.log(`[GuildDelete] Bot retiré du serveur : ${guild.id}`);

    // Supprimer de la base de données et du cache
    await Guild.deleteOne({ guildId: guild.id }).then(() => {
      GuildCache.delete(guild.id);
      console.log(`[GuildDelete] Serveur ${guild.id} supprimé de la base de données et du cache`);
    }).catch(error => {
      console.error(`[GuildDelete] Erreur lors de la suppression du serveur ${guild.id} de la base de données:`, error);
    });

    const logEmbed = new EmbedBuilder()
      .setTitle('Serveur quitté')
      .setColor(Colors.Red)
      .addFields(
        { name: 'Nom', value: guild.name ?? 'Inconnu', inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Membres', value: guild.memberCount?.toString() ?? 'Inconnu', inline: true },
        { name: 'Propriétaire', value: guild.ownerId ? `<@${guild.ownerId}> (${guild.ownerId})` : 'Inconnu', inline: true }
      )
      .setTimestamp(new Date()) // Ajoute le timestamp Discord
      .setThumbnail(guild.iconURL() ?? null);

    const logChannel = guild.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel?.type === ChannelType.GuildText) {
      try {
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`[GuildDelete] Log envoyé pour le serveur ${guild.id}`);
      } catch (error) {
        console.error(`[GuildDelete] Erreur lors de l'envoi du log pour ${guild.id}:`, error);
      }
    } else {
      console.error(`[GuildDelete] Canal de logs (${LOG_CHANNEL_ID}) invalide ou non trouvé`);
    }
  },
});

async function createGuild(guildId: string) {
  if (GuildCache.has(guildId) || (await Guild.findOne({ guildId }))) return;

  try {
    const res = await Guild.create({ guildId });
    await res.save().then(() => {
      GuildCache.add(guildId);
      console.log(`[CreateGuild] Serveur ${guildId} ajouté à la base de données et au cache`);
    });
  } catch (error) {
    console.error(`[CreateGuild] Erreur lors de l'ajout du serveur ${guildId} à la base de données:`, error);
  }
}

export default [onGuildCreate, onMessageCreate, onGuildDelete];
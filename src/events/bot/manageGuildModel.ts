import { Guild } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { Events, EmbedBuilder, Colors, ChannelType, TextChannel } from 'discord.js';

const GuildCache = new Set<string>();
const LOG_CHANNEL_ID = '1351312330759344158'; // Remplacez par l'ID réel

const onGuildCreate = new DiscordEventBuilder({
  type: Events.GuildCreate,
  async execute(guild) {
    await createGuild(guild.id);

    let invite;
    try {
      // Vérifier que le bot est bien dans le serveur
      const botMember = guild.members.me;
      if (!botMember) throw new Error('Bot member not found');

      // Trouver un canal textuel où le bot peut créer une invitation
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
      }
    } catch (error) {
      console.error(`Erreur lors de la création de l'invitation pour ${guild.name}:`, error);
    }

    const logEmbed = new EmbedBuilder()
      .setTitle('Nouveau serveur rejoint')
      .setColor(Colors.Green)
      .addFields(
        { name: 'Nom', value: guild.name, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Membres', value: guild.memberCount.toString(), inline: true },
        { name: 'Propriétaire', value: `<@${guild.ownerId}> (${guild.ownerId})`, inline: true },
        { name: 'Invitation', value: invite ? `[Lien](${invite.url})` : 'Non générée', inline: true },
        { name: 'Date', value: new Date().toLocaleString(), inline: true }
      )
      .setThumbnail(guild.iconURL());

    const logChannel = guild.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel?.type === ChannelType.GuildText) {
      await logChannel.send({ embeds: [logEmbed] });
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
    await Guild.deleteOne({ guildId: guild.id }).then(() =>
      GuildCache.delete(guild.id)
    );

    const logEmbed = new EmbedBuilder()
      .setTitle('Serveur quitté')
      .setColor(Colors.Red)
      .addFields(
        { name: 'Nom', value: guild.name || 'Inconnu', inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Membres', value: guild.memberCount?.toString() || 'Inconnu', inline: true },
        { name: 'Propriétaire', value: guild.ownerId ? `<@${guild.ownerId}> (${guild.ownerId})` : 'Inconnu', inline: true },
        { name: 'Date', value: new Date().toLocaleString(), inline: true }
      )
      .setThumbnail(guild.iconURL());

    const logChannel = guild.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel?.type === ChannelType.GuildText) {
      await logChannel.send({ embeds: [logEmbed] });
    }
  },
});

async function createGuild(guildId: string) {
  if (GuildCache.has(guildId) || (await Guild.findOne({ guildId }))) return;

  const res = await Guild.create({ guildId });
  await res.save().then(() => GuildCache.add(guildId));
}

export default [onGuildCreate, onMessageCreate, onGuildDelete];
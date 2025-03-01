import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { channelField, scheduleField, userField } from '@modules/fields';
import { createAttachment, getSendableChannel } from '@modules/util';
import {
  AuditLogEvent,
  Collection,
  Colors,
  EmbedBuilder,
  Events,
} from 'discord.js';
import type { GuildAuditLogsEntry, Message } from 'discord.js';

const lastLogs = new Collection<
  string,
  GuildAuditLogsEntry<AuditLogEvent.MessageDelete>
>();

export default new DiscordEventBuilder({
  type: Events.MessageDelete,
  async execute(message) {
    if (!message.inGuild() || message.author.bot) return; // Ignore les bots

    const log = await getAuditLog(message);
    const executor = await log?.executor?.fetch().catch(() => null);
    const beforeMsg = await message.channel.messages
      .fetch({ before: message.id, limit: 1 })
      .then((v) => v.first())
      .catch(() => null);

    // Vérifie si les logs de suppression sont activés
    const { messageDelete: setting } =
      (await EventLogConfig.findOne({ guildId: message.guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;

    const channel = await getSendableChannel(message.guild, setting.channel).catch(() => {
      EventLogConfig.updateOne(
        { guildId: message.guild.id },
        { $set: { messageDelete: { enabled: false, channel: null } } },
      );
    });
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Message supprimé')
      .setURL(beforeMsg?.url ?? null)
      .setDescription(
        [
          channelField(message.channel),
          userField(message.author, { label: 'Auteur' }),
          userField(executor ?? message.author, { label: 'Supprimé par' }),
          scheduleField(message.createdAt, { label: 'Envoyé le' }),
        ].join('\n'),
      )
      .addFields({
        name: 'Message',
        value: message.content || 'Aucun contenu',
      })
      .setColor(Colors.White)
      .setThumbnail(message.author.displayAvatarURL())
      .setTimestamp();

    if (message.stickers.size) {
      embed.addFields({
        name: 'Stickers',
        value: message.stickers.map((v) => v.name).join('\n'),
      });
    }

    // Vérifie s'il y a des fichiers joints au message
    const attachment = await createAttachment(message.attachments);
    if (attachment) {
      await channel.send({ embeds: [embed], files: [attachment] });
    } else {
      await channel.send({ embeds: [embed] });
    }
  },
});

// Fonction pour récupérer les logs d'audit Discord
async function getAuditLog(message: Message<true>) {
  if (!message.inGuild()) return;

  const entry = await message.guild
    .fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 3,
    })
    .then((v) =>
      v.entries.find(
        (e) =>
          e.target.equals(message.author) &&
          e.extra.channel.id === message.channel.id,
      ),
    );

  const lastLog = lastLogs.get(message.guild.id);

  if (entry && !(lastLog?.id === entry.id && lastLog.extra.count >= entry.extra.count)) {
    lastLogs.set(message.guild.id, entry);
    return entry;
  }
}
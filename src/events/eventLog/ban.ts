import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { textField, userField } from '@modules/fields';
import { getSendableChannel } from '@modules/util';
import {
  AuditLogEvent,
  Colors,
  EmbedBuilder,
  Events,
  type GuildAuditLogsEntry,
  type User,
} from 'discord.js';

const state = [
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
] as const;

type BanAuditLogEntry = GuildAuditLogsEntry<AuditLogEvent.MemberBanAdd | AuditLogEvent.MemberBanRemove>;

export default new DiscordEventBuilder({
  type: Events.GuildAuditLogEntryCreate,
  async execute(auditLogEntry: GuildAuditLogsEntry, guild) {
    // Vérifie si l'action est un ban ou un déban
    if (!state.includes(auditLogEntry.action as AuditLogEvent.MemberBanAdd | AuditLogEvent.MemberBanRemove)) return;
    const { executor, target, reason, action } = auditLogEntry as BanAuditLogEntry;
    const banTarget = target as User; // Forcer le typage de target en User
    if (!(executor && banTarget)) return;

    const isCancel = action === AuditLogEvent.MemberBanRemove;
    const { ban: setting } = (await EventLogConfig.findOne({ guildId: guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;

    const channel = await getSendableChannel(guild, setting.channel).catch(() => {
      EventLogConfig.updateOne(
        { guildId: guild.id },
        { $set: { ban: { enabled: false, channel: null } } },
      );
    });
    if (!channel) return;

    // Création d'un embed amélioré
    const embed = new EmbedBuilder()
      .setTitle(`${isCancel ? '🛡️ Déban' : '🔨 Ban'} d’un membre`)
      .setDescription(
        `Un membre a été ${isCancel ? 'débanni' : 'banni'} du serveur. Voici les détails :`
      )
      .addFields(
        {
          name: '👤 Membre concerné',
          value: userField(banTarget, { label: null }) || 'Utilisateur inconnu',
          inline: true,
        },
        {
          name: '🛠️ Modérateur',
          value: userField(await executor.fetch(), { label: null }) || 'Inconnu',
          inline: true,
        },
        {
          name: '📝 Raison',
          value: reason ?? 'Aucune raison spécifiée',
          inline: false,
        }
      )
      .setColor(isCancel ? Colors.Green : Colors.Red) // Vert pour déban, rouge pour ban
      .setThumbnail(banTarget.displayAvatarURL())
      .setFooter({
        text: `ID: ${banTarget.id} • ${isCancel ? 'Déban' : 'Ban'} effectué`,
        iconURL: guild.iconURL() ?? undefined,
      })
      .setTimestamp();

    // Envoi de l'embed dans le channel
    await channel.send({ embeds: [embed] });
  },
});
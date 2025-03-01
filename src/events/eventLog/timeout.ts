import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { scheduleField, textField, userField } from '@modules/fields';
import { getSendableChannel } from '@modules/util';
import {
  AuditLogEvent,
  Colors,
  EmbedBuilder,
  Events,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  inlineCode,
  type GuildAuditLogsEntry,
  type User,
} from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.GuildAuditLogEntryCreate,
  async execute(auditLogEntry: GuildAuditLogsEntry, guild) {
    if (auditLogEntry.action !== AuditLogEvent.MemberUpdate) return;

    const timeoutChange = auditLogEntry.changes.find((v) => v.key === 'communication_disabled_until');
    if (!timeoutChange) return;

    const { executor, target, reason } = auditLogEntry as GuildAuditLogsEntry<AuditLogEvent.MemberUpdate>;
    const timeoutTarget = target as User; // Forcer le typage de target en User
    if (!(executor && timeoutTarget)) return;

    const member = await guild.members.fetch(timeoutTarget.id).catch(() => null); // Utilise timeoutTarget.id
    if (!member) return;

    const isCancel = !timeoutChange.new || Date.parse(timeoutChange.new as string) <= Date.now();
    const { timeout: setting } = (await EventLogConfig.findOne({ guildId: guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;

    const channel = await getSendableChannel(guild, setting.channel).catch(() => {
      EventLogConfig.updateOne(
        { guildId: guild.id },
        { $set: { timeout: { enabled: false, channel: null } } },
      );
    });
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`${inlineCode('🛑')} Timeout ${isCancel ? 'Annulé' : ''}`)
      .setDescription(
        [
          userField(timeoutTarget, { label: 'Cible' }), // Utilise timeoutTarget typé comme User
          scheduleField(member.communicationDisabledUntil ?? 0, { label: 'Date de fin' }),
          '',
          userField(await executor.fetch(), { label: 'Exécuteur', color: 'blurple' }),
          textField(reason ?? 'Aucune raison fournie', { label: 'Raison', color: 'blurple' }),
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .setColor(isCancel ? Colors.Blue : Colors.Red)
      .setThumbnail(timeoutTarget.displayAvatarURL()) // Utilise timeoutTarget
      .setTimestamp();

    if (!isCancel) {
      const untimeoutButton = new ButtonBuilder()
        .setCustomId(`untimeout_${timeoutTarget.id}`) // Utilise timeoutTarget.id
        .setLabel('Annuler le Timeout')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(untimeoutButton);

      await channel.send({ embeds: [embed], components: [row] });
    } else {
      await channel.send({ embeds: [embed] });
    }
  },
});
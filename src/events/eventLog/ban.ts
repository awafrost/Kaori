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
  inlineCode,
} from 'discord.js';

const state = [
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberBanRemove,
] as const;

export default new DiscordEventBuilder({
  type: Events.GuildAuditLogEntryCreate,
  async execute(auditLogEntry, guild) {
    if (!isBanLog(auditLogEntry)) return;
    const { executor, target, reason, actionType } = auditLogEntry;
    if (!(executor && target)) return;

    const isCancel = actionType === 'Create';
    const { ban: setting } =
      (await EventLogConfig.findOne({ guildId: guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;
    const channel = await getSendableChannel(guild, setting.channel).catch(
      () => {
        EventLogConfig.updateOne(
          { guildId: guild.id },
          { $set: { ban: { enabled: false, channel: null } } },
        );
      },
    );
    if (!channel) return;
    channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${inlineCode('🔨')} BAN${isCancel ? ' Removal' : ''}`)
          .setDescription(
            [
              userField(target, { label: 'Target' }),
              '',
              userField(await executor.fetch(), {
                label: 'Executor',
                color: 'blurple',
              }),
              textField(reason ?? 'No reason provided', {
                label: 'Reason',
                color: 'blurple',
              }),
            ].join('\n'),
          )
          .setColor(isCancel ? Colors.Blue : Colors.Red)
          .setThumbnail(target.displayAvatarURL())
          .setTimestamp(),
      ],
    });
  },
});

function isBanLog(
  entry: GuildAuditLogsEntry,
): entry is GuildAuditLogsEntry<(typeof state)[number]> {
  return (state as unknown as AuditLogEvent[]).includes(entry.action);
}
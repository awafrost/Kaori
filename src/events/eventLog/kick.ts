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
} from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.GuildAuditLogEntryCreate,
  async execute(auditLogEntry, guild) {
    if (auditLogEntry.action !== AuditLogEvent.MemberKick) return;
    const { executor, target, reason } =
      auditLogEntry as GuildAuditLogsEntry<AuditLogEvent.MemberKick>;
    if (!(executor && target)) return;
    const { kick: setting } =
      (await EventLogConfig.findOne({ guildId: guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;
    const channel = await getSendableChannel(guild, setting.channel).catch(
      () => {
        EventLogConfig.updateOne(
          { guildId: guild.id },
          { $set: { kick: { enabled: false, channel: null } } },
        );
      },
    );
    if (!channel) return;
    channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('`🔨` Kick')
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
          .setColor(Colors.Orange)
          .setThumbnail(target.displayAvatarURL())
          .setTimestamp(),
      ],
    });
  },
});
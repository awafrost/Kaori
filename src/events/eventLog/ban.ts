import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { textField, userField } from '@modules/fields';
import { getSendableChannel } from '@modules/util';
import {
  AuditLogEvent,
  Colors,
  EmbedBuilder,
  Events,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
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

    const embed = new EmbedBuilder()
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
      .setTimestamp();

    // Only add the unban button if it's a ban event (not an unban event)
    if (!isCancel) {
      const unbanButton = new ButtonBuilder()
        .setCustomId(`unban_${target.id}`) // Store the user's ID in the custom ID
        .setLabel('Débannir')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(unbanButton);

      await channel.send({
        embeds: [embed],
        components: [row],
      });
    } else {
      // If it's an unban event, just send the embed without the button
      await channel.send({ embeds: [embed] });
    }
  },
});

function isBanLog(
  entry: GuildAuditLogsEntry,
): entry is GuildAuditLogsEntry<(typeof state)[number]> {
  return (state as unknown as AuditLogEvent[]).includes(entry.action);
}
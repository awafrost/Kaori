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
  inlineCode,
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
    const { ban: setting } =
      (await EventLogConfig.findOne({ guildId: guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;

    const channel = await getSendableChannel(guild, setting.channel).catch(() => {
      EventLogConfig.updateOne(
        { guildId: guild.id },
        { $set: { ban: { enabled: false, channel: null } } },
      );
    });
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`${inlineCode('🔨')} BAN${isCancel ? ' Annulé' : ''}`)
      .setDescription(
        [
          userField(banTarget, { label: 'Cible' }), // Utilise banTarget typé comme User
          '',
          userField(await executor.fetch(), {
            label: 'Exécuteur',
            color: 'blurple',
          }),
          textField(reason ?? 'Aucune raison fournie', {
            label: 'Raison',
            color: 'blurple',
          }),
        ].join('\n'),
      )
      .setColor(isCancel ? Colors.Blue : Colors.Red)
      .setThumbnail(banTarget.displayAvatarURL()) // Utilise banTarget
      .setTimestamp();

    if (!isCancel) {
      const unbanButton = new ButtonBuilder()
        .setCustomId(`unban_${banTarget.id}`) // Utilise banTarget.id
        .setLabel('Débannir')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(unbanButton);

      await channel.send({
        embeds: [embed],
        components: [row],
      });
    } else {
      await channel.send({ embeds: [embed] });
    }
  },
});
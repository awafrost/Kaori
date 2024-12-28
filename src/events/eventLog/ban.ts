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
  InteractionType,
  PermissionFlagsBits,
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
      await channel.send({ embeds: [embed] });
    }
  },
});

function isBanLog(
  entry: GuildAuditLogsEntry,
): entry is GuildAuditLogsEntry<(typeof state)[number]> {
  return (state as unknown as AuditLogEvent[]).includes(entry.action);
}

// New event listener for button interactions
export const interactionCreate = new DiscordEventBuilder({
  type: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.type !== InteractionType.MessageComponent) return;
    if (!interaction.isButton()) return;

    const [command, userId] = interaction.customId.split('_');

    if (command === 'unban') {
      try {
        // Check if the user has permissions to unban
        if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
          await interaction.reply({ content: 'You do not have permission to unban users.', ephemeral: true });
          return;
        }

        // Check if interaction is within a guild
        if (!interaction.guildId || !interaction.guild) {
          await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
          return;
        }

        // Unban the user
        await interaction.guild.members.unban(userId, `Unbanned by ${interaction.user.tag}`);
        await interaction.reply({ content: `User ${userId} has been unbanned.`, ephemeral: true });

        // Optionally, you might want to log this action or update the message to show that the user was unbanned
      } catch (error) {
        console.error('Failed to unban user:', error);
        await interaction.reply({ content: 'There was an error unbanning this user.', ephemeral: true });
      }
    }
  },
});
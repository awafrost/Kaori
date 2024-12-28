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
  PermissionFlagsBits,
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

    const embed = new EmbedBuilder()
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
      .setTimestamp();

    // Add a button to re-add the user to the server
    const addBackButton = new ButtonBuilder()
      .setCustomId(`addBack_${target.id}`)
      .setLabel('Réintégrer')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(addBackButton);

    await channel.send({
      embeds: [embed],
      components: [row],
    });
  },
});

// Interaction handler for the "Réintégrer" button
export const interactionCreate = new DiscordEventBuilder({
  type: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;
    
    const [command, userId] = interaction.customId.split('_');

    if (command === 'addBack') {
      try {
        // Check if the user has permissions to invite users
        if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.CreateInstantInvite)) {
          await interaction.reply({ content: 'You do not have permission to add users back to the server.', ephemeral: true });
          return;
        }

        // Check if interaction is within a guild
        if (!interaction.guildId || !interaction.guild) {
          await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
          return;
        }

        // Create an invite for the user, assuming you want to re-add them to the default channel
        const invite = await interaction.guild.invites.create(interaction.channelId, {
          maxAge: 0, // Makes the invite permanent
          maxUses: 1,
          unique: true,
          reason: `Re-added by ${interaction.user.tag}`,
        });

        await interaction.reply({
          content: `User ${userId} has been reinvited. Here's the invite link: ${invite.url}`,
          ephemeral: true,
        });

        // Optionally, you might want to log this action or update the message to show that the user was reinvited
      } catch (error) {
        console.error('Failed to re-add user:', error);
        await interaction.reply({ content: 'There was an error reinviting this user.', ephemeral: true });
      }
    }
  },
});
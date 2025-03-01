import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { scheduleField, textField, userField } from '@modules/fields';
import { getSendableChannel } from '@modules/util';
import {
  AuditLogEvent,
  Colors,
  EmbedBuilder,
  Events,
  type GuildAuditLogsEntry,
  inlineCode,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  PermissionFlagsBits,
} from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.GuildAuditLogEntryCreate,
  async execute(auditLogEntry, guild) {
    if (auditLogEntry.action !== AuditLogEvent.MemberUpdate) return;
    
    const timeoutChange = auditLogEntry.changes.find((v) => v.key === 'communication_disabled_until');
    if (!timeoutChange) return;

    const { executor, target, reason } = auditLogEntry as GuildAuditLogsEntry<AuditLogEvent.MemberUpdate>;
    if (!(executor && target)) return;

    const member = await guild.members.fetch(target).catch(() => null);
    if (!member) return;

    const isCancel = Date.parse((timeoutChange.new ?? 0) as string) <= Date.now();
    const { timeout: setting } = (await EventLogConfig.findOne({ guildId: guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;

    const channel = await getSendableChannel(guild, setting.channel).catch(() => {
      EventLogConfig.updateOne(
        { guildId: guild.id },
        { $set: { timeout: { enabled: false, channel: null } } }
      );
    });

    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`${inlineCode('🛑')} Timeout ${isCancel ? 'Canceled' : ''}`)
      .setDescription(
        [
          userField(target, { label: 'Target' }),
          scheduleField(member.communicationDisabledUntil ?? 0, { label: 'Release Time' }),
          '',
          userField(await executor.fetch(), { label: 'Executor', color: 'blurple' }),
          textField(reason ?? 'No reason provided', { label: 'Reason', color: 'blurple' }),
        ]
          .filter(Boolean)
          .join('\n')
      )
      .setColor(isCancel ? Colors.Blue : Colors.Red)
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    if (!isCancel) {
      const untimeoutButton = new ButtonBuilder()
        .setCustomId(`untimeout_${target.id}`)
        .setLabel('Annuler le Timeout')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(untimeoutButton);

      await channel.send({ embeds: [embed], components: [row] });
    } else {
      await channel.send({ embeds: [embed] });
    }
  },
});

// Gestion des interactions avec le bouton et le modal
export const interactionCreate = new DiscordEventBuilder({
  type: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.type !== InteractionType.MessageComponent && interaction.type !== InteractionType.ModalSubmit) return;

    // Si un bouton est cliqué
    if (interaction.isButton()) {
      const [command, userId] = interaction.customId.split('_');
      
      if (command === 'untimeout') {
        // Ouvre le modal pour entrer les détails du débannissement
        const modal = new ModalBuilder()
          .setCustomId(`untimeoutModal_${userId}`)
          .setTitle('Annuler le Timeout');

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Raison de l\'annulation')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
      }
    }

    // Si un modal est soumis
    if (interaction.isModalSubmit()) {
      const [command, userId] = interaction.customId.split('_');

      if (command === 'untimeoutModal') {
        const reason = interaction.fields.getTextInputValue('reason');

        if (!interaction.guildId || !interaction.guild) {
          await interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
          return;
        }

        // Vérification des permissions
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
          await interaction.reply({ content: 'Vous n\'avez pas la permission d\'annuler un timeout.', ephemeral: true });
          return;
        }

        try {
          const member = await interaction.guild.members.fetch(userId);
          if (!member) {
            await interaction.reply({ content: 'Utilisateur introuvable.', ephemeral: true });
            return;
          }

          // Annulation du timeout
          await member.timeout(null, `Annulé par ${interaction.user.tag}: ${reason}`);

          await interaction.reply({ content: `Le timeout de ${member.user.tag} a été annulé.`, ephemeral: true });

          // Log dans le canal d'événements
          const { timeout: setting } = (await EventLogConfig.findOne({ guildId: interaction.guildId })) ?? {};
          if (setting?.enabled && setting.channel) {
            const logChannel = await getSendableChannel(interaction.guild, setting.channel).catch(() => null);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle('⏳ Timeout Annulé')
                .setDescription(
                  [
                    userField(member.user, { label: 'Utilisateur' }),
                    userField(interaction.user, { label: 'Modérateur', color: 'blurple' }),
                    textField(reason, { label: 'Raison', color: 'blurple' }),
                  ].join('\n')
                )
                .setColor(Colors.Green)
                .setTimestamp();
              await logChannel.send({ embeds: [logEmbed] });
            }
          }
        } catch (error) {
          console.error('Erreur lors de l\'annulation du timeout:', error);
          await interaction.reply({ content: 'Une erreur est survenue lors de l\'annulation du timeout.', ephemeral: true });
        }
      }
    }
  },
});
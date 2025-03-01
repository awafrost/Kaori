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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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
          userField(target, { label: 'Cible' }),
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
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    if (!isCancel) {
      const unbanButton = new ButtonBuilder()
        .setCustomId('unban_request')
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

// Gestion des interactions (bouton et modal)
export const interactionCreate = new DiscordEventBuilder({
  type: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.type !== InteractionType.MessageComponent && interaction.type !== InteractionType.ModalSubmit) return;

    // Si l'utilisateur clique sur le bouton "Débannir"
    if (interaction.isButton() && interaction.customId === 'unban_request') {
      const modal = new ModalBuilder()
        .setCustomId('unban_modal')
        .setTitle('Débannissement');

      const userIdInput = new TextInputBuilder()
        .setCustomId('unban_user_id')
        .setLabel('ID de l’utilisateur')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Entrez l’ID du membre')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('unban_reason')
        .setLabel('Raison du débannissement')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Expliquez pourquoi cet utilisateur est débanni.')
        .setRequired(true);

      const actionRow1 = new ActionRowBuilder<TextInputBuilder>().addComponents(userIdInput);
      const actionRow2 = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);

      modal.addComponents(actionRow1, actionRow2);

      await interaction.showModal(modal);
    }

    // Si l'utilisateur soumet le formulaire
    if (interaction.isModalSubmit() && interaction.customId === 'unban_modal') {
      try {
        const userId = interaction.fields.getTextInputValue('unban_user_id');
        const reason = interaction.fields.getTextInputValue('unban_reason');

        // Vérification des permissions
        if (!interaction.guildId || !interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
          await interaction.reply({ content: 'Vous n\'avez pas la permission de débannir des utilisateurs.', ephemeral: true });
          return;
        }

        // Vérification que l'interaction est bien dans un serveur
        if (!interaction.guildId || !interaction.guild) {
          await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
          return;
        }

        // Débannir l'utilisateur
        await interaction.guild.members.unban(userId, `Débanni par ${interaction.user.tag} | Raison : ${reason}`);
        await interaction.reply({ content: `L'utilisateur <@${userId}> a été débanni avec succès.`, ephemeral: true });

        // Logger l'action dans les logs du serveur
        const logConfig = await EventLogConfig.findOne({ guildId: interaction.guild.id });
        if (logConfig?.ban?.enabled && logConfig.ban.channel) {
          const logChannel = await getSendableChannel(interaction.guild, logConfig.ban.channel);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('✅ Débannissement effectué')
              .setColor(Colors.Green)
              .setDescription(
                [
                  `👤 **Utilisateur débanni** : <@${userId}> (${userId})`,
                  `🛠️ **Modérateur** : ${interaction.user.tag}`,
                  `📝 **Raison** : ${reason}`,
                ].join('\n'),
              )
              .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } catch (error) {
        console.error('Échec du débannissement de l\'utilisateur:', error);
        await interaction.reply({ content: 'Il y a eu une erreur lors du débannissement de cet utilisateur.', ephemeral: true });
      }
    }
  },
});
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
        .setCustomId(`unban_${target.id}`) // Stocke l'ID de l'utilisateur dans le custom ID
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

// Nouveau gestionnaire d'événements pour les interactions avec les boutons
export const interactionCreate = new DiscordEventBuilder({
  type: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.type !== InteractionType.MessageComponent) return;
    if (!interaction.isButton()) return;

    const [command, userId] = interaction.customId.split('_');

    if (command === 'unban') {
      try {
        // Vérification des permissions pour débannir
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
        await interaction.guild.members.unban(userId, `Débanni par ${interaction.user.tag}`);
        await interaction.reply({ content: `L'utilisateur ${userId} a été débanni.`, ephemeral: true });

        // Optionnellement, vous pourriez vouloir logger cette action ou mettre à jour le message pour indiquer que l'utilisateur a été débanni
      } catch (error) {
        console.error('Échec du débannissement de l\'utilisateur:', error);
        await interaction.reply({ content: 'Il y a eu une erreur lors du débannissement de cet utilisateur.', ephemeral: true });
      }
    }
  },
});
import { Button } from '@akki256/discord-interaction';
import { TicketConfig, TicketTranscript } from '@models';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';

export default new Button(
  {
    customId: /^ticket_create_\d+_\d+$/,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
    if (!config?.ticketCategoryId) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Le système de tickets n\'est pas configuré.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    const buttonConfig = config.ticketButtons.find(
      (btn) => btn.customId === interaction.customId,
    );
    if (!buttonConfig) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Bouton de ticket invalide.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0,
        parent: config.ticketCategoryId,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: interaction.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketChannel.id}`)
          .setLabel('Fermer')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ticket_transcript_${ticketChannel.id}`)
          .setLabel('Transcription')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_delete_${ticketChannel.id}`)
          .setLabel('Supprimer')
          .setStyle(ButtonStyle.Danger),
      );

      await ticketChannel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [
          new EmbedBuilder()
            .setTitle(buttonConfig.embedTitle || 'Ticket')
            .setDescription(buttonConfig.embedDescription || 'Comment pouvons-nous vous aider ?')
            .setColor(Colors.Blurple),
        ],
        components: [row],
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`\`✅\` Ticket créé : <#${ticketChannel.id}>`)
            .setColor(Colors.Green),
        ],
        ephemeral: true,
      });
    } catch (error) {
      console.error('[ERROR] Failed to create ticket channel:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Erreur lors de la création du ticket.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    }
  },
);

export const closeButton = new Button(
  {
    customId: /^ticket_close_\d+$/,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    try {
      if (interaction.channel.isTextBased() && !interaction.channel.isThread()) {
        await (interaction.channel as TextChannel).permissionOverwrites.edit(interaction.user.id, {
          SendMessages: false,
        });
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`✅` Ticket fermé.')
            .setColor(Colors.Green),
        ],
      });

      await interaction.user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Fermé')
            .setDescription(
              `Votre ticket dans **${interaction.guild.name}** a été fermé.\n` +
              `**ID du ticket** : ${interaction.channel.id}\n` +
              `**Fermé le** : ${new Date().toLocaleString('fr-FR')}`,
            )
            .setColor(Colors.Blurple),
        ],
      });
    } catch (error) {
      console.error('[ERROR] Failed to close ticket:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Erreur lors de la fermeture du ticket.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    }
  },
);

export const transcriptButton = new Button(
  {
    customId: /^ticket_transcript_\d+$/,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel?.isTextBased()) return;

    try {
      const transcript = await TicketTranscript.findOne({
        guildId: interaction.guild.id,
        ticketId: interaction.channel.id,
      });

      const messages = transcript?.messages
        ?.map(
          (msg) =>
            `[${new Date(msg.timestamp).toLocaleString()}] <@${msg.authorId}>: ${msg.content}`,
        )
        .join('\n') || 'Aucun message enregistré.';

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Transcription du Ticket ${interaction.channel.id}`)
            .setDescription(messages)
            .setColor(Colors.Blurple),
        ],
        ephemeral: true,
      });
    } catch (error) {
      console.error('[ERROR] Failed to fetch transcript:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Erreur lors de la récupération de la transcription.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    }
  },
);

export const deleteButton = new Button(
  {
    customId: /^ticket_delete_\d+$/,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    try {
      await interaction.channel.delete();

      await interaction.user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Supprimé')
            .setDescription(
              `Votre ticket dans **${interaction.guild.name}** a été supprimé.\n` +
              `**ID du ticket** : ${interaction.channel.id}\n` +
              `**Supprimé le** : ${new Date().toLocaleString('fr-FR')}`,
            )
            .setColor(Colors.Blurple),
        ],
      });
    } catch (error) {
      console.error('[ERROR] Failed to delete ticket:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Erreur lors de la suppression du ticket.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    }
  },
);
import { Button } from '@akki256/discord-interaction';
import { Ticket, TicketConfig, TicketTranscript } from '@models';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

const ticketCreateButton = new Button(
  { customId: /^ticket_create_[0-2]_[0-9]+$/ },
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

    const buttonIndex = parseInt(interaction.customId.split('_')[2]);
    const buttonConfig = config.ticketButtons[buttonIndex];
    if (!buttonConfig) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Bouton invalide.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: 0,
      parent: config.ticketCategoryId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        {
          id: interaction.client.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fermer')
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [
        new EmbedBuilder()
          .setTitle(buttonConfig.embedTitle || 'Ticket Ouvert')
          .setDescription(
            buttonConfig.embedDescription || 'Comment pouvons-nous vous aider ?',
          )
          .setColor(Colors.Blurple),
      ],
      components: [row],
    });

    const ticket = new Ticket({
      guildId: interaction.guild.id,
      channelId: channel.id,
      userId: interaction.user.id,
      lastActivity: new Date(),
    });
    await ticket.save();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`\`✅\` Ticket créé : <#${channel.id}>`)
          .setColor(Colors.Green),
      ],
      ephemeral: true,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
  },
);

const ticketCloseButton = new Button(
  { customId: 'ticket_close' },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const ticket = await Ticket.findOne({
      guildId: interaction.guild.id,
      channelId: interaction.channelId,
    });
    if (!ticket) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Ticket non trouvé.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    // Enregistrer la transcription
    const messages = await interaction.channel?.messages.fetch({ limit: 100 });
    if (messages) {
      const transcriptMessages = messages
        .filter((msg) => !msg.author.bot)
        .map((msg) => ({
          authorId: msg.author.id,
          content: msg.content || '[Aucun contenu]',
          timestamp: msg.createdAt,
        }))
        .reverse();

      const transcript = new TicketTranscript({
        guildId: interaction.guild.id,
        ticketId: interaction.channelId,
        userId: ticket.userId,
        messages: transcriptMessages,
      });
      await transcript.save();
    }

    await interaction.channel?.edit({
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: ticket.userId,
          deny: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
      ],
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_reopen')
        .setLabel('Rouvrir')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Supprimer')
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      content: `<@${ticket.userId}>`,
      embeds: [
        new EmbedBuilder()
          .setDescription(
            'Le ticket est fermé. Il sera supprimé automatiquement dans 24h s\'il reste inactif.',
          )
          .setColor(Colors.Red),
      ],
      components: [row],
    });

    ticket.lastActivity = new Date();
    await ticket.save();
  },
);

const ticketReopenButton = new Button(
  { customId: 'ticket_reopen' },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const ticket = await Ticket.findOne({
      guildId: interaction.guild.id,
      channelId: interaction.channelId,
    });
    if (!ticket) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Ticket non trouvé.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.channel?.edit({
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: ticket.userId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
      ],
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fermer')
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      content: `<@${ticket.userId}>`,
      embeds: [
        new EmbedBuilder()
          .setDescription('Le ticket a été rouvert.')
          .setColor(Colors.Green),
      ],
      components: [row],
    });

    ticket.lastActivity = new Date();
    await ticket.save();
  },
);

const ticketDeleteButton = new Button(
  { customId: 'ticket_delete' },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const ticket = await Ticket.findOne({
      guildId: interaction.guild.id,
      channelId: interaction.channelId,
    });
    if (!ticket) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Ticket non trouvé.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    // Enregistrer la transcription
    const messages = await interaction.channel?.messages.fetch({ limit: 100 });
    if (messages) {
      const transcriptMessages = messages
        .filter((msg) => !msg.author.bot)
        .map((msg) => ({
          authorId: msg.author.id,
          content: msg.content || '[Aucun contenu]',
          timestamp: msg.createdAt,
        }))
        .reverse();

      const transcript = new TicketTranscript({
        guildId: interaction.guild.id,
        ticketId: interaction.channelId,
        userId: ticket.userId,
        messages: transcriptMessages,
      });
      await transcript.save();
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription('`✅` Le ticket sera supprimé dans 5 secondes.')
          .setColor(Colors.Green),
      ],
    });

    setTimeout(async () => {
      await interaction.channel?.delete().catch(() => {});
      await Ticket.deleteOne({ channelId: interaction.channelId });
    }, 5000);
  },
);

module.exports = [
  ticketCreateButton,
  ticketCloseButton,
  ticketReopenButton,
  ticketDeleteButton,
];
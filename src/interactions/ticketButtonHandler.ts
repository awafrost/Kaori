import { Button } from '@akki256/discord-interaction';
import { Ticket, TicketConfig } from '@models';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  Client,
  Interaction,
  StringSelectMenuInteraction,
} from 'discord.js';

// Gestionnaires de boutons
const ticketCreateButton = new Button(
  { customId: /^ticket_create_[0-4]_[0-9]+$/ },
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
        .setCustomId('ticket_close')
        .setLabel('Fermer')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('1360548202042097825'),
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Supprimer')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('1360548398092124271'),
      new ButtonBuilder()
        .setCustomId(`ticket_mention_${interaction.user.id}`)
        .setLabel('Rappel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1360544289440137278'),
    );

    await channel.send({
      content: `<@${interaction.user.id}> <a:pipu_peekaboo:1260209668899344475>`,
      embeds: [
        new EmbedBuilder()
          .setTitle(buttonConfig.embedTitle || 'Ticket Ouvert')
          .setDescription(
            buttonConfig.embedDescription || 'Comment pouvons-nous vous aider ?',
          )
          .setColor('#131416'),
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
        .setStyle(ButtonStyle.Success)
        .setEmoji('1360548202042097825'),
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Supprimer')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('1360548398092124271'),
      new ButtonBuilder()
        .setCustomId(`ticket_mention_${ticket.userId}`)
        .setLabel('Rappel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1360544289440137278'),
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

    try {
      const user = await interaction.client.users.fetch(ticket.userId);
      const timestamp = Math.floor(Date.now() / 1000);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Fermé')
            .setDescription(
              `Votre ticket dans **${interaction.guild.name}** a été fermé.\n` +
              `**ID du ticket** : ${ticket.channelId}\n` +
              `**Fermé le** : <t:${timestamp}:F>`,
            )
            .setColor('#131416'),
        ],
      });
    } catch (error) {
      console.error(`Impossible d'envoyer un DM à ${ticket.userId} :`, error);
    }

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
        .setCustomId('ticket_close')
        .setLabel('Fermer')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('1360548202042097825'),
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Supprimer')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('1360548398092124271'),
      new ButtonBuilder()
        .setCustomId(`ticket_mention_${ticket.userId}`)
        .setLabel('Rappel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('1360544289440137278'),
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

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription('`✅` Le ticket sera supprimé dans 5 secondes.')
          .setColor(Colors.Green),
      ],
    });

    try {
      const user = await interaction.client.users.fetch(ticket.userId);
      const timestamp = Math.floor(Date.now() / 1000);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Ticket Supprimé')
            .setDescription(
              `Votre ticket dans **${interaction.guild.name}** a été supprimé.\n` +
              `**ID du ticket** : ${ticket.channelId}\n` +
              `**Supprimé le** : <t:${timestamp}:F>`,
            )
            .setColor('#131416'),
        ],
      });
    } catch (error) {
      console.error(`Impossible d'envoyer un DM à ${ticket.userId} :`, error);
    }

    setTimeout(async () => {
      await interaction.channel?.delete().catch(() => {});
      await Ticket.deleteOne({ channelId: interaction.channelId });
    }, 5000);
  },
);

const ticketMentionButton = new Button(
  { customId: /^ticket_mention_[0-9]+$/ },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const creatorId = interaction.customId.split('_')[2];
    await interaction.reply({
      content: `<@${creatorId}> En quoi pouvons-nous vous aider ?`,
      ephemeral: false,
    });
  },
);

// Gestionnaire pour le menu déroulant (StringSelectMenu)
const setupStringSelectMenuHandler = (client: Client) => {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.inCachedGuild()) return;

    const selectInteraction = interaction as StringSelectMenuInteraction;

    if (selectInteraction.customId === 'remove_ticket_button') {
      const index = parseInt(selectInteraction.values[0]);
      const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
      if (!config || index >= config.ticketButtons.length) {
        await selectInteraction.update({
          embeds: [
            new EmbedBuilder()
              .setDescription('`❌` Bouton non trouvé.')
              .setColor(Colors.Red),
          ],
          components: [],
        });
        return;
      }

      const removedButton = config.ticketButtons.splice(index, 1)[0];
      await config.save();

      await selectInteraction.update({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `\`✅\` Bouton supprimé : ${
                removedButton.emoji.match(/^\d+$/)
                  ? `<:${removedButton.emoji}:${removedButton.emoji}>`
                  : removedButton.emoji
              }`,
            )
            .setColor(Colors.Green),
        ],
        components: [],
      });
    }
  });
};

module.exports = [
  ticketCreateButton,
  ticketCloseButton,
  ticketReopenButton,
  ticketDeleteButton,
  ticketMentionButton,
  setupStringSelectMenuHandler,
];
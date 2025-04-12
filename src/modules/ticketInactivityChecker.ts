import { Client, PermissionFlagsBits, TextChannel } from 'discord.js';
import { Ticket, TicketTranscript } from '@models';
import {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export async function startTicketInactivityChecker(client: Client) {
  setInterval(async () => {
    const tickets = await Ticket.find();

    for (const ticket of tickets) {
      const lastActivity = new Date(ticket.lastActivity);
      const now = new Date();
      const hoursSinceActivity =
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      const channel = await client.channels
        .fetch(ticket.channelId)
        .catch(() => null);
      if (!channel?.isTextBased()) {
        await Ticket.deleteOne({ _id: ticket._id });
        continue;
      }

      // Envoyer un avertissement après 24 heures
      if (hoursSinceActivity >= 24 && hoursSinceActivity < 48) {
        const warning = await channel.messages
          .fetch({ limit: 1 })
          .then((msgs) =>
            msgs.find((msg) =>
              msg.content.includes(
                'sera supprimé automatiquement dans 24h',
              ),
            ),
          )
          .catch(() => null);

        if (!warning) {
          await channel.send({
            content: `<@${ticket.userId}>`,
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  'Ce ticket est inactif depuis 24h. Il sera fermé automatiquement dans 24h si aucune activité n\'est détectée.',
                )
                .setColor(Colors.Orange),
            ],
          });
        }
      }

      // Fermeture automatique après 48 heures
      if (hoursSinceActivity >= 48) {
        // Enregistrer la transcription
        const messages = await channel.messages.fetch({ limit: 100 });
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
            guildId: ticket.guildId,
            ticketId: ticket.channelId,
            userId: ticket.userId,
            messages: transcriptMessages,
          });
          await transcript.save();
        }

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                'Le ticket est inactif depuis 48h et va être fermé.',
              )
              .setColor(Colors.Red),
          ],
        });

        if (channel instanceof TextChannel) {
          await channel.edit({
            permissionOverwrites: [
              { id: ticket.guildId, deny: [PermissionFlagsBits.ViewChannel] },
              {
                id: ticket.userId,
                deny: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ],
              },
              {
                id: client.user!.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                ],
              },
            ],
          });
        }

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

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setDescription('Ticket fermé pour inactivité.')
              .setColor(Colors.Red),
          ],
          components: [row],
        });

        await Ticket.deleteOne({ _id: ticket._id });
      }
    }
  }, 60 * 60 * 1000); // Exécuter toutes les heures
}
import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { channelField, scheduleField, userField } from '@modules/fields';
import { createAttachment, getSendableChannel } from '@modules/util';
import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Colors,
  EmbedBuilder,
  Events,
} from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    // Vérifie que le message est dans une guilde et n'est pas d'un bot (Corriger à cause de Suzuya)
    if (!oldMessage.inGuild() || !newMessage.inGuild() || oldMessage.author.bot) return;

    // Récupère les paramètres de log pour la guilde
    const { messageEdit: setting } =
      (await EventLogConfig.findOne({ guildId: oldMessage.guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;

    // Récupère le canal de log
    const channel = await getSendableChannel(oldMessage.guild, setting.channel).catch(() => {
      EventLogConfig.updateOne(
        { guildId: oldMessage.guild.id },
        { $set: { messageEdit: { enabled: false, channel: null } } },
      );
    });
    if (!channel) return;

    // Crée l'embed de log
    const embed = new EmbedBuilder()
      .setTitle('✏️ Message modifié')
      .setURL(newMessage.url) // Utilise newMessage.url pour pointer vers le message actuel
      .setDescription(
        [
          channelField(oldMessage.channel),
          userField(oldMessage.author, { label: 'Auteur' }),
          scheduleField(oldMessage.createdAt, { label: 'Envoyé le' }),
        ].join('\n'),
      )
      .setColor(Colors.Yellow)
      .setThumbnail(oldMessage.author.displayAvatarURL())
      .setTimestamp();

    // Vérifie si le contenu a changé et ajoute les champs correspondants
    const contentChanged = oldMessage.content !== newMessage.content;
    if (contentChanged) {
      embed.addFields(
        { name: 'Avant modification', value: oldMessage.content || 'Aucun contenu', inline: true },
        { name: 'Après modification', value: newMessage.content || 'Aucun contenu', inline: true },
      );
    }

    // Crée les boutons
    const jumpButton = new ButtonBuilder()
      .setLabel('Aller au message')
      .setStyle(ButtonStyle.Link) // Style lien pour rediriger directement
      .setURL(newMessage.url); // Lien vers le message modifié

    const deleteButton = new ButtonBuilder()
      .setCustomId(`delete_${oldMessage.id}`)
      .setLabel('Supprimer le message')
      .setStyle(ButtonStyle.Danger);

    // Ajoute les boutons dans une ActionRow
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(jumpButton, deleteButton);

    // Gère les pièces jointes
    const attachment = await createAttachment(oldMessage.attachments.difference(newMessage.attachments));

    // Envoie le message de log
    await channel.send({
      embeds: [embed],
      components: [row],
      files: attachment ? [attachment] : [],
    });
  },
});

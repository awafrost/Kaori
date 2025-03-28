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
    // Vérifie que le message est dans une guilde et n'est pas d'un bot
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
      .setURL(newMessage.url)
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
      .setStyle(ButtonStyle.Link)
      .setURL(newMessage.url);

    const deleteButton = new ButtonBuilder()
      .setCustomId(`delete_${oldMessage.id}`)
      .setLabel('Supprimer le message')
      .setStyle(ButtonStyle.Danger);

    // Ajoute les boutons dans une ActionRow
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(jumpButton, deleteButton);

    // Gère les pièces jointes
    const attachment = await createAttachment(oldMessage.attachments.difference(newMessage.attachments));

    // Envoie le message de log
    const logMessage = await channel.send({
      embeds: [embed],
      components: [row],
      files: attachment ? [attachment] : [],
    });

    // Crée un collector pour gérer l'interaction du bouton supprimer
    const collector = logMessage.createMessageComponentCollector({
      filter: i => i.customId === `delete_${oldMessage.id}`,
      time: 24 * 60 * 60 * 1000 // 24h timeout
    });

    collector.on('collect', async interaction => {
      try {
        // Vérifie les permissions de l'utilisateur
        if (!interaction.member.permissions.has('ManageMessages')) {
          return await interaction.reply({
            content: "Vous n'avez pas la permission de supprimer des messages !",
            ephemeral: true
          });
        }

        // Supprime le message original
        await newMessage.delete();
        
        // Met à jour le message de log
        embed.setTitle('✏️ Message modifié (supprimé)');
        embed.setColor(Colors.Red);
        
        await interaction.update({
          content: "✅ Message supprimé avec succès",
          embeds: [embed],
          components: [] // Retire les boutons
        });
      } catch (error) {
        await interaction.reply({
          content: "Erreur lors de la suppression du message : " + error.message,
          ephemeral: true
        });
      }
    });

    collector.on('end', () => {
      // Désactive les boutons après le timeout
      logMessage.edit({ 
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            jumpButton,
            deleteButton.setDisabled(true)
          )
        ] 
      }).catch(() => {});
    });
  },
});
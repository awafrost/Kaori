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
    if (!oldMessage.inGuild() || oldMessage.author.bot) return;

    const { messageEdit: setting } =
      (await EventLogConfig.findOne({ guildId: oldMessage.guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;

    const channel = await getSendableChannel(oldMessage.guild, setting.channel).catch(() => {
      EventLogConfig.updateOne(
        { guildId: oldMessage.guild.id },
        { $set: { messageEdit: { enabled: false, channel: null } } },
      );
    });
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Message modifié')
      .setURL(oldMessage.url)
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

    const contentChanged = oldMessage.content !== newMessage.content;
    if (contentChanged) {
      embed.addFields(
        { name: 'Avant modification', value: oldMessage.content || 'Aucun contenu' },
        { name: 'Après modification', value: newMessage.content || 'Aucun contenu' },
      );
    }

    // Ajout du bouton "Supprimer le message"
    const deleteButton = new ButtonBuilder()
      .setCustomId(`delete_${oldMessage.id}`) // Identifiant unique avec l'ID du message
      .setLabel('Supprimer le message')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton);

    const attachment = await createAttachment(oldMessage.attachments.difference(newMessage.attachments));

    if (attachment) {
      await channel.send({ embeds: [embed], files: [attachment], components: [row] });
    } else {
      await channel.send({ embeds: [embed], components: [row] });
    }
  },
});
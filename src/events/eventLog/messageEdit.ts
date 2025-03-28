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
    if (!oldMessage.inGuild() || !newMessage.inGuild() || oldMessage.author.bot) return;

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

    const contentChanged = oldMessage.content !== newMessage.content;
    if (contentChanged) {
      embed.addFields(
        { name: 'Avant modification', value: oldMessage.content || 'Aucun contenu', inline: true },
        { name: 'Après modification', value: newMessage.content || 'Aucun contenu', inline: true },
      );
    }

    const jumpButton = new ButtonBuilder()
      .setLabel('Aller au message')
      .setStyle(ButtonStyle.Link)
      .setURL(newMessage.url);

    const deleteButton = new ButtonBuilder()
      .setCustomId(`delete_${oldMessage.id}`)
      .setLabel('Supprimer le message')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(jumpButton, deleteButton);
    const attachment = await createAttachment(oldMessage.attachments.difference(newMessage.attachments));

    const logMessage = await channel.send({
      embeds: [embed],
      components: [row],
      files: attachment ? [attachment] : [],
    });

    const collector = logMessage.createMessageComponentCollector({
      filter: i => i.customId === `delete_${oldMessage.id}`,
      time: 24 * 60 * 60 * 1000
    });

    collector.on('collect', async interaction => {
      try {
        if (!interaction.member.permissions.has('ManageMessages')) {
          return await interaction.reply({
            content: "Vous n'avez pas la permission de supprimer des messages !",
            ephemeral: true
          });
        }

        await newMessage.delete();
        embed.setTitle('✏️ Message modifié (supprimé)');
        embed.setColor(Colors.Red);
        
        await interaction.update({
          content: "✅ Message supprimé avec succès",
          embeds: [embed],
          components: []
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        await interaction.reply({
          content: `Erreur lors de la suppression du message : ${errorMessage}`,
          ephemeral: true
        });
      }
    });

    collector.on('end', () => {
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
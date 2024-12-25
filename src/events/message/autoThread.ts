import { AutoCreateThreadConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, PermissionsBitField } from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.MessageCreate,
  async execute(message) {
    if (!message.inGuild()) return;

    const setting = await AutoCreateThreadConfig.findOne({
      guildId: message.guild.id,
    });

    if (!setting?.enabled) return;
    if (!setting.channels.includes(message.channel.id)) return;

    // Ajouter des réactions au message
    await message.react('<:like:1321430061802324061>');
    await message.react('<:disline:1321430059311173693>');
    await message.react('<:zrougelovii:1260653164487770193>');

    // Créer un thread pour le message
    const thread = await message.startThread({
      name: `${message.author.username}'s Thread`,
      reason: 'auto thread create',
    });

    // Créer l'embed pour le thread avec des règles de vie
    const embed = new EmbedBuilder()
      .setTitle('Thread Information')
      .setDescription(`Thread créé par ${message.author.tag}`)
      .addFields(
        { name: 'Règles de Vie', value: 
          '1. Soyez respectueux.\n' +
          '2. Évitez le spam.\n' +
          '3. Ne partagez pas de contenu inapproprié.\n' +
          '4. Respectez la confidentialité des autres.'
        }
      )
      .setColor('#FFD1DC'); // Set the color to pastel pink

    // Créer un bouton pour supprimer le thread et le message original
    const deleteButton = new ButtonBuilder()
      .setCustomId('delete_thread_and_message')
      .setLabel('Supprimer le Thread et le Message')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton);

    // Envoyer l'embed et le bouton dans le thread
    await thread.send({ embeds: [embed], components: [row] });

    // Ajouter un listener pour le bouton de suppression
    const collector = thread.createMessageComponentCollector({ 
      filter: (i) => i.customId === 'delete_thread_and_message',
    });

    collector.on('collect', async (interaction) => {
      if (interaction.member?.permissions instanceof PermissionsBitField && interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        try {
          // Supprimer le message original
          await message.delete();

          // Supprimer le thread
          await thread.delete('Thread et message original supprimés par un administrateur');

          // Répondre à l'interaction
          await interaction.reply({ content: 'Le thread et le message ont été supprimés.', ephemeral: true });
        } catch (error) {
          console.error('Erreur lors de la suppression du thread et du message:', error);
          await interaction.reply({ content: 'Impossible de supprimer le thread ou le message.', ephemeral: true });
        }
      } else {
        // Si l'utilisateur n'est pas admin, envoyer un message éphémère
        await interaction.reply({ content: 'Vous n\'avez pas la permission de faire cela.', ephemeral: true });
      }
    });
  },
});
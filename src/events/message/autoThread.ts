import { AutoCreateThreadConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { Events, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, PermissionsBitField } from 'discord.js';

const compliments = [
  "C'est magnifique !",
  "Superbe travail !",
  "Incroyablement bien fait !",
  "Tu déchires !",
  "Quel talent !",
];

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

    // Random compliment
    const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];

    // Créer un bouton pour supprimer le thread et le message original
    const deleteButton = new ButtonBuilder()
      .setCustomId('confirm_delete')
      .setLabel('Supprimer')
      .setEmoji('1282880442332352602')
      .setStyle(ButtonStyle.Danger);

    // Ajouter un bouton pour inviter le bot
    const inviteButton = new ButtonBuilder()
      .setURL('https://discord.com/oauth2/authorize?client_id=855107430693077033')
      .setLabel('Inviter')
      .setEmoji('1323284326778933279')
      .setStyle(ButtonStyle.Link);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton, inviteButton);

    // Envoyer le message avec compliment et les boutons dans le thread
    await thread.send({ content: randomCompliment, components: [row] });

    // Ajouter un listener pour le bouton de suppression
    const collector = thread.createMessageComponentCollector({ 
      filter: (i) => i.customId === 'confirm_delete',
    });

    collector.on('collect', async (interaction) => {
      if (interaction.member?.permissions instanceof PermissionsBitField && interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        // Création des boutons de confirmation
        const confirmYes = new ButtonBuilder()
          .setCustomId('confirm_yes')
          .setLabel('Oui')
          .setStyle(ButtonStyle.Success);

        const confirmNo = new ButtonBuilder()
          .setCustomId('confirm_no')
          .setLabel('Non')
          .setStyle(ButtonStyle.Danger);

        const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmYes, confirmNo);

        await interaction.reply({ 
          content: 'Êtes-vous sûr de vouloir supprimer le thread et le message original ?', 
          components: [confirmRow], 
          ephemeral: true 
        });

        // Ajouter un listener pour la confirmation
        const confirmCollector = interaction.channel?.createMessageComponentCollector({
          filter: (i) => i.customId === 'confirm_yes' || i.customId === 'confirm_no',
          time: 15000,  // Cette collecte expire après 15 secondes
          max: 1       // Une seule interaction est nécessaire
        });

        confirmCollector?.on('collect', async (confirmInteraction) => {
          if (confirmInteraction.customId === 'confirm_yes') {
            try {
              // Vérifier si le message original existe encore
              let messageDeleted = false;
              try {
                await message.fetch(); // Vérifie si le message existe
                await message.delete(); // Supprime le message s'il existe
                messageDeleted = true;
              } catch (error) {
                // Si le message est déjà supprimé, on continue pour supprimer le thread
                messageDeleted = false;
              }

              // Supprimer le thread
              await thread.delete('Thread supprimé par un administrateur');

              // Répondre à l'interaction
              if (messageDeleted) {
                await confirmInteraction.update({ 
                  content: 'Le thread et le message ont été supprimés.', 
                  components: [] 
                });
              } else {
                await confirmInteraction.update({ 
                  content: 'Le message original était déjà supprimé. Le thread a été supprimé.', 
                  components: [] 
                });
              }
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              await confirmInteraction.update({ 
                content: 'Impossible de supprimer le thread.', 
                components: [] 
              });
            }
          } else {
            await confirmInteraction.update({ content: 'Action annulée.', components: [] });
          }
        });

        confirmCollector?.on('end', collected => {
          if (collected.size === 0) {
            interaction.editReply({ content: 'Temps écoulé, action annulée.', components: [] });
          }
        });
      } else {
        // Si l'utilisateur n'est pas admin, envoyer un message éphémère
        await interaction.reply({ content: 'Vous n\'avez pas la permission de faire cela.', ephemeral: true });
      }
    });
  },
});
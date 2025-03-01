import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs';

export default new ChatInput(
  {
    name: 'pat',
    description: 'Tapoter quelqu’un ou soi-même avec un GIF',
    options: [
      {
        name: 'cible',
        description: 'L’utilisateur à tapoter',
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
    defaultMemberPermissions: null,
    dmPermission: true,
  },
  async (interaction) => {
    const targetUser = interaction.options.getUser('cible');
    const actionText = targetUser
      ? `${interaction.user} tapote ${targetUser} <:zrougelovii:1260653164487770193>`
      : `${interaction.user} se tapote la tête <:zrougelovii:1260653164487770193>`;

    try {
      const response = await axios.get('https://nekos.best/api/v2/pat');
      if (response.data.results.length === 0) {
        return interaction.reply({ content: 'Aucune image disponible pour cette interaction.', ephemeral: true });
      }

      const imageUrl = response.data.results[0].url;
      const fileName = `pat-${Date.now()}.gif`;

      // Télécharger l'image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(fileName, imageResponse.data);

      // Créer un fichier à partir de l'image téléchargée
      const attachment = new AttachmentBuilder(fileName);

      // Ajouter un bouton lien pour télécharger directement l'image
      const button = new ButtonBuilder()
        .setLabel('Télécharger l’image')
        .setStyle(ButtonStyle.Link)
        .setURL(imageUrl);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      // Répondre avec le texte, l'image et le bouton
      await interaction.reply({ content: actionText, files: [attachment], components: [row] });

      // Nettoyer : supprimer le fichier temporaire
      fs.unlinkSync(fileName);
    } catch (error) {
      console.error('Erreur lors de l’interaction "pat":', error);
      await interaction.reply({
        content: 'Une erreur est survenue lors de l’interaction.',
        ephemeral: true,
      });
    }
  }
);
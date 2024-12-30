import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs';

export default new ChatInput(
  {
    name: 'interaction',
    description: 'Effectuez une interaction avec un autre utilisateur',
    options: [
      {
        name: 'type',
        description: 'Type d\'interaction (hug, kiss, slap)',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Câlin', value: 'hug' },
          { name: 'Baiser', value: 'kiss' },
          { name: 'Gifle', value: 'slap' },
        ],
      },
      {
        name: 'cible',
        description: 'L\'utilisateur avec qui interagir',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
    defaultMemberPermissions: null,
    dmPermission: true,
  },
  async (interaction) => {
    const interactionType = interaction.options.getString('type', true);
    const targetUser = interaction.options.getUser('cible', true);

    try {
      const response = await axios.get(`https://nekos.best/api/v2/${interactionType}`);
      if (response.data.results.length === 0) {
        return interaction.reply({ content: 'Aucune image disponible pour cette interaction.', ephemeral: true });
      }

      const imageUrl = response.data.results[0].url;
      const fileName = `${interactionType}-${Date.now()}.gif`;

      // Télécharger l'image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(fileName, imageResponse.data);

      let actionText;
      switch (interactionType) {
        case 'hug':
          actionText = `${interaction.user} a fait un câlin à ${targetUser} <:zrougelovii:1260653164487770193>`;
          break;
        case 'kiss':
          actionText = `${interaction.user} a embrassé ${targetUser} <:zrougelovii:1260653164487770193>`;
          break;
        case 'slap':
          actionText = `${interaction.user} a giflé ${targetUser} <:zrougelovii:1260653164487770193>`;
          break;
        default:
          return interaction.reply({ content: 'Type d\'interaction non supporté.', ephemeral: true });
      }

      // Créer un fichier à partir de l'image téléchargée
      const attachment = new AttachmentBuilder(fileName);

      // Ajouter un bouton lien pour télécharger directement l'image
      const button = new ButtonBuilder()
        .setLabel('Télécharger l\'image')
        .setStyle(ButtonStyle.Link)
        .setURL(imageUrl);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      // Répondre avec le texte, l'image et le bouton
      await interaction.reply({ content: actionText, files: [attachment], components: [row] });

      // Nettoyer : supprimer le fichier temporaire
      fs.unlinkSync(fileName);

    } catch (error) {
      console.error(`Erreur lors de l'interaction de type ${interactionType}:`, error);
      await interaction.reply({
        content: 'Une erreur est survenue lors de l\'interaction.',
        ephemeral: true,
      });
    }
  }
);

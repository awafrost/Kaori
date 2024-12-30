import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import axios from 'axios';

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

      // Création d'un bouton lien
      const button = new ButtonBuilder()
        .setLabel('Télécharger l\'image')
        .setStyle(ButtonStyle.Link)
        .setURL(imageUrl);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      // Réponse avec le bouton lien
      await interaction.reply({ content: actionText, components: [row] });

    } catch (error) {
      console.error(`Erreur lors de l'interaction de type ${interactionType}:`, error);
      await interaction.reply({
        content: 'Une erreur est survenue lors de l\'interaction.',
        ephemeral: true,
      });
    }
  }
);
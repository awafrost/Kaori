import { ChatInput } from '@akki256/discord-interaction';
import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  AttachmentBuilder,
  Events,
  ChatInputCommandInteraction,
} from 'discord.js';
import axios from 'axios';
import fs from 'fs';

// Interface for nekos.best response structure
interface NekosBestResponse {
  results: {
    anime_name: string;
    url: string;
  }[];
}

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
  async (interaction: ChatInputCommandInteraction) => {
    const interactionType = interaction.options.getString('type', true);
    const targetUser = interaction.options.getUser('cible', true);

    try {
      const response = await axios.get<NekosBestResponse>(`https://nekos.best/api/v2/${interactionType}`);
      
      if (response.data.results.length === 0) {
        return interaction.reply({ content: 'Aucune image disponible pour cette interaction.', ephemeral: true });
      }

      const imageUrl = response.data.results[0].url;
      const fileName = `${interactionType}.gif`;

      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(fileName, imageResponse.data);

      let actionText;
      switch (interactionType) {
        case 'hug':
          actionText = `${interaction.user} a fait un câlin à ${targetUser}`;
          break;
        case 'kiss':
          actionText = `${interaction.user} a embrassé ${targetUser}`;
          break;
        case 'slap':
          actionText = `${interaction.user} a giflé ${targetUser}`;
          break;
        default:
          return interaction.reply({ content: 'Type d\'interaction non supporté.', ephemeral: true });
      }

      const attachment = new AttachmentBuilder(fileName);
      const button = new ButtonBuilder()
        .setCustomId(`return_${interactionType}_${interaction.user.id}_${targetUser.id}`)
        .setLabel('Retourner l\'interaction')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await interaction.reply({ content: actionText, files: [attachment], components: [row], fetchReply: true });
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

export const interactionCreateHandler = {
  name: 'returnInteraction',
  event: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    if (!customId.startsWith('return_')) return;

    const [, interactionType, originalUserId, originalTargetId] = customId.split('_');

    if (interaction.user.id !== originalTargetId) {
      await interaction.reply({ content: 'Seul le destinataire original peut retourner cette interaction.', ephemeral: true });
      return;
    }

    try {
      const response = await axios.get<NekosBestResponse>(`https://nekos.best/api/v2/${interactionType}`);
      
      if (response.data.results.length === 0) {
        await interaction.reply({ content: 'Aucune image disponible pour cette interaction.', ephemeral: true });
        return;
      }

      const imageUrl = response.data.results[0].url;
      const fileName = `${interactionType}.gif`;

      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(fileName, imageResponse.data);

      let actionText;
      switch (interactionType) {
        case 'hug':
          actionText = `${interaction.user} a fait un câlin à <@${originalUserId}>`;
          break;
        case 'kiss':
          actionText = `${interaction.user} a embrassé <@${originalUserId}>`;
          break;
        case 'slap':
          actionText = `${interaction.user} a giflé <@${originalUserId}>`;
          break;
        default:
          await interaction.reply({ content: 'Type d\'interaction non supporté.', ephemeral: true });
          return;
      }

      const attachment = new AttachmentBuilder(fileName);
      await interaction.channel?.send({ content: actionText, files: [attachment] });
      await interaction.update({ components: [] });

      fs.unlinkSync(fileName);

    } catch (error) {
      console.error(`Erreur lors du retour de l'interaction de type ${interactionType}:`, error);
      await interaction.reply({ content: 'Une erreur est survenue lors du retour de l\'interaction.', ephemeral: true });
    }
  },
};

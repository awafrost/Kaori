import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, Events } from 'discord.js';
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
          { name: 'Gifle', value: 'slap' }
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
      const response = await axios.get<NekosBestResponse>(`https://nekos.best/api/v2/${interactionType}`);
      
      if (response.data.results.length === 0) {
        return interaction.reply({ content: 'Aucune image disponible pour cette interaction.', ephemeral: true });
      }

      const imageUrl = response.data.results[0].url;
      const fileName = `${interactionType}.gif`;  

      // Download the image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(fileName, imageResponse.data);

      let actionText;
      switch(interactionType) {
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

      // Create an attachment from the saved file
      const attachment = new AttachmentBuilder(fileName);

      // Create the button to return the action
      const button = new ButtonBuilder()
        .setCustomId(`return_${interactionType}_${interaction.user.id}_${targetUser.id}`)
        .setLabel('Retourner l\'interaction')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      // Reply with the content, attachment, and button
      const message = await interaction.reply({ content: actionText, files: [attachment], components: [row], fetchReply: true });

      // Clean up: Remove the temporary file after sending
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

// Handler for the return interaction button
export const interactionCreateHandler = {
  name: 'returnInteraction',
  event: Events.InteractionCreate,
  async execute(interaction: { isButton: () => any; customId: { startsWith: (arg0: string) => any; split: (arg0: string) => [any, any, any, any]; }; user: { id: any; }; reply: (arg0: { content: string; ephemeral: boolean; }) => any; guild: { members: { cache: { get: (arg0: any) => any; }; }; }; channel: { send: (arg0: { content: string; files: AttachmentBuilder[]; }) => any; }; update: (arg0: { components: never[]; }) => any; }) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('return_')) return;

    const [, interactionType, originalUserId, originalTargetId] = interaction.customId.split('_');

    // Check if the user clicking the button is the original target
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

      // Download the image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(fileName, imageResponse.data);

      let actionText;
      switch(interactionType) {
        case 'hug':
          actionText = `${interaction.user} a fait un câlin à ${interaction.guild.members.cache.get(originalUserId)} <:zrougelovii:1260653164487770193>`;
          break;
        case 'kiss':
          actionText = `${interaction.user} a embrassé ${interaction.guild.members.cache.get(originalUserId)} <:zrougelovii:1260653164487770193>`;
          break;
        case 'slap':
          actionText = `${interaction.user} a giflé ${interaction.guild.members.cache.get(originalUserId)} <:zrougelovii:1260653164487770193>`;
          break;
        default:
          await interaction.reply({ content: 'Type d\'interaction non supporté.', ephemeral: true });
          return;
      }

      const attachment = new AttachmentBuilder(fileName);
      await interaction.channel.send({ content: actionText, files: [attachment] });
      
      // Disable the button after interaction is returned once
      await interaction.update({ components: [] });

      // Clean up: Remove the temporary file after sending
      fs.unlinkSync(fileName); 

    } catch (error) {
      console.error(`Erreur lors du retour de l'interaction de type ${interactionType}:`, error);
      await interaction.reply({ content: 'Une erreur est survenue lors du retour de l\'interaction.', ephemeral: true });
    }
  }
};
import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
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
    description: 'Perform an interaction with another user',
    options: [
      {
        name: 'type',
        description: 'Type of interaction (hug, kiss, slap)',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Hug', value: 'hug' },
          { name: 'Kiss', value: 'kiss' },
          { name: 'Slap', value: 'slap' }
        ],
      },
      {
        name: 'target',
        description: 'The user to interact with',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
    defaultMemberPermissions: null,
    dmPermission: true,
  },
  async (interaction) => {
    const interactionType = interaction.options.getString('type', true);
    const targetUser = interaction.options.getUser('target', true);

    try {
      const response = await axios.get<NekosBestResponse>(`https://nekos.best/api/v2/${interactionType}`);
      
      if (response.data.results.length === 0) {
        return interaction.reply({ content: 'No image available for this interaction.', ephemeral: true });
      }

      const imageUrl = response.data.results[0].url;
      const fileName = `${interactionType}.gif`;  // Naming the file based on interaction type

      // Download the image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(fileName, imageResponse.data);

      let actionText;
      switch(interactionType) {
        case 'hug':
          actionText = `${interaction.user} hugged ${targetUser} <:zrougelovii:1260653164487770193>`;
          break;
        case 'kiss':
          actionText = `${interaction.user} kissed ${targetUser} <:zrougelovii:1260653164487770193>`;
          break;
        case 'slap':
          actionText = `${interaction.user} slapped ${targetUser} <:zrougelovii:1260653164487770193>`;
          break;
        default:
          return interaction.reply({ content: 'Unsupported interaction type.', ephemeral: true });
      }

      // Create an attachment from the saved file
      const attachment = new AttachmentBuilder(fileName);

      // Create the button to return the action
      const button = new ButtonBuilder()
        .setCustomId(`return_${interactionType}_${interaction.user.id}_${targetUser.id}`)
        .setLabel('Return Interaction')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      // Reply with the content, attachment, and button
      await interaction.reply({ content: actionText, files: [attachment], components: [row] });

      // Clean up: Remove the temporary file after sending
      fs.unlinkSync(fileName); // Optional, to delete the file after sending

    } catch (error) {
      console.error(`Error during ${interactionType} interaction:`, error);
      await interaction.reply({
        content: 'An error occurred during the interaction.',
        ephemeral: true,
      });
    }
  }
);

// You also need to add a handler for the interaction return button
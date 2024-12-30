import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';

// Interface for nekos.best response structure
interface NekosBestResponse {
  url: string;
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
      // Fetch the corresponding image from nekos.best
      const response = await axios.get<NekosBestResponse>(`https://nekos.best/api/v2/${interactionType}`);
      const imageUrl = response.data.url;

      let actionText;
      switch(interactionType) {
        case 'hug':
          actionText = `${interaction.user.username} hugged ${targetUser.username} <:zrougelovii:1260653164487770193>`
          break;
        case 'kiss':
          actionText = `${interaction.user.username} kissed ${targetUser.username} <:zrougelovii:1260653164487770193>`;
          break;
        case 'slap':
          actionText = `${interaction.user.username} slapped ${targetUser.username} <:zrougelovii:1260653164487770193>`;
          break;
        default:
          return interaction.reply({ content: 'Unsupported interaction type.', ephemeral: true });
      }

      // Create the embed for the interaction
      const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setDescription(actionText)
        .setImage(imageUrl);

      // Create the button to return the action
      const button = new ButtonBuilder()
        .setCustomId(`return_${interactionType}_${interaction.user.id}_${targetUser.id}`)
        .setLabel('Return Interaction')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await interaction.reply({ embeds: [embed], components: [row] });
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
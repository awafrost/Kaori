import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';

export default new ChatInput(
  {
    name: 'avatar',
    description: 'View a user’s avatar',
    options: [
      {
        name: 'user',
        description: 'User to view avatar of',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
  },
  (interaction) => {
    const user = interaction.options.getUser('user');
    if (!user) {
      return interaction.reply({ content: 'User not found', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setColor('Random');

    interaction.reply({ embeds: [embed] });
  },
);
import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, EmbedBuilder, Colors } from 'discord.js';

export default new ChatInput(
  {
    name: 'avatar',
    description: 'View a user’s avatar',
    options: [
      {
        name: 'user',
        description: 'User to view avatar of',
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
  },
  (interaction) => {
    // If no user is specified, use the interaction's user
    const user = interaction.options.getUser('user') || interaction.user;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setColor(Colors.Blurple);

    interaction.reply({ embeds: [embed] });
  },
)
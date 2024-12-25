import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, EmbedBuilder, Colors } from 'discord.js';

export default new ChatInput(
  {
    name: 'banner',
    description: 'View a user’s banner',
    options: [
      {
        name: 'user',
        description: 'User to view banner of',
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
  },
  async (interaction) => {
    // If no user is specified, use the interaction's user
    const user = await (interaction.options.getUser('user') || interaction.user).fetch();

    const bannerURL = user.bannerURL({ size: 1024 });
    if (!bannerURL) {
      return interaction.reply({ content: 'User does not have a banner', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Banner`)
      .setImage(bannerURL)
      .setColor(Colors.Blurple);

    interaction.reply({ embeds: [embed] });
  },
);
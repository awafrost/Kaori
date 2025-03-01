import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, EmbedBuilder, Colors } from 'discord.js';

export default new ChatInput(
  {
    name: 'banner',
    description: 'Voir la bannière d’un utilisateur',
    options: [
      {
        name: 'user',
        description: 'Utilisateur dont voir la bannière',
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
  },
  async (interaction) => {
    // Si aucun utilisateur n’est spécifié, utiliser l’utilisateur de l’interaction
    const user = await (interaction.options.getUser('user') || interaction.user).fetch();

    const bannerURL = user.bannerURL({ size: 1024 });
    if (!bannerURL) {
      return interaction.reply({ content: 'L’utilisateur n’a pas de bannière', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Bannière de ${user.tag}`)
      .setImage(bannerURL)
      .setColor(Colors.Blurple);

    interaction.reply({ embeds: [embed] });
  },
);
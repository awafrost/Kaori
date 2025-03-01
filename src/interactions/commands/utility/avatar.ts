import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, EmbedBuilder, Colors } from 'discord.js';

export default new ChatInput(
  {
    name: 'avatar',
    description: 'Voir l’avatar d’un utilisateur',
    options: [
      {
        name: 'user',
        description: 'Utilisateur dont voir l’avatar',
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
  },
  (interaction) => {
    // Si aucun utilisateur n’est spécifié, utiliser l’utilisateur de l’interaction
    const user = interaction.options.getUser('user') || interaction.user;

    const embed = new EmbedBuilder()
      .setTitle(`Avatar de ${user.tag}`)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setColor(Colors.Blurple);

    interaction.reply({ embeds: [embed] });
  },
);
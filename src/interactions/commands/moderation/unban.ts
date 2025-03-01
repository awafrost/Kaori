import { ChatInput } from '@akki256/discord-interaction';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'unban',
    description: 'Débannir un utilisateur du serveur',
    options: [
      {
        name: 'userid',
        description: 'ID de l’utilisateur à débannir',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const userId = interaction.options.getString('userid');
    if (!userId) {
      return interaction.reply({ content: 'L’ID de l’utilisateur est requis', ephemeral: true });
    }

    try {
      await interaction.guild.members.unban(userId);
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${inlineCode('✅')} L’utilisateur avec l’ID ${userId} a été débanni`)
            .setColor(Colors.Green),
        ],
      });
    } catch (err) {
      interaction.reply({
        content: `${inlineCode('❌')} Échec du débannissement de l’utilisateur`,
        ephemeral: true,
      });
    }
  },
);
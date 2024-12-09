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
    description: 'Unban a user from the server',
    options: [
      {
        name: 'userid',
        description: 'ID of the user to unban',
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
      return interaction.reply({ content: 'User ID is required', ephemeral: true });
    }

    try {
      await interaction.guild.members.unban(userId);
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${inlineCode('✅')} User with ID ${userId} has been unbanned`)
            .setColor(Colors.Green),
        ],
      });
    } catch (err) {
      interaction.reply({
        content: `${inlineCode('❌')} Failed to unban user`,
        ephemeral: true,
      });
    }
  },
);
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
    name: 'ban',
    description: 'Ban a user from the server and notify them via DM',
    options: [
      {
        name: 'user',
        description: 'User to ban',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'reason',
        description: 'Reason for the ban',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const user = interaction.options.getUser('user');
    if (!user) {
      return interaction.reply({ content: 'User not found', ephemeral: true });
    }

    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    try {
      // Envoi du DM avant le ban
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${inlineCode('❌')} You have been banned from **${interaction.guild.name}**`
            )
            .addFields({ name: 'Reason', value: reason })
            .setColor(Colors.Red),
        ],
      }).catch(() => {
        // Ignore si l'envoi échoue (DM désactivés ou autres restrictions)
      });

      // Bannir l'utilisateur
      await interaction.guild.members.ban(user, { reason: `${reason} - ${interaction.user.tag}` });

      // Confirmation publique
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${inlineCode('✅')} ${user.tag} has been banned.`)
            .addFields({ name: 'Reason', value: reason })
            .setColor(Colors.Red),
        ],
      });
    } catch (err) {
      console.error('Ban Error:', err); // Pour déboguer
      interaction.reply({
        content: `${inlineCode('❌')} Failed to ban the user. Please check my permissions or the target's status.`,
        ephemeral: true,
      });
    }
  }
);
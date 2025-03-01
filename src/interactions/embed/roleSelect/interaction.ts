import { SelectMenu, SelectMenuType } from '@akki256/discord-interaction';
import { Colors, EmbedBuilder, MessageFlags } from 'discord.js';

const roleSelect = new SelectMenu(
  {
    customId: /^kaori:roleSelectMenu(-[1-5])?$|^reactionRole$/,
    type: SelectMenuType.String,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;
    if (interaction.message.flags.has(MessageFlags.Ephemeral))
      return interaction.update({});

    await interaction.deferReply({ ephemeral: true });

    const roles = interaction.member.roles;
    let error = false;

    await roles
      .remove(
        interaction.component.options
          .map((opt) => opt.value)
          .filter((opt) => !interaction.values.includes(opt)),
      )
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      .catch(() => (error = true));
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    await roles.add(interaction.values).catch(() => (error = true));

    if (error)
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Certains rôles n’ont pas pu être ajoutés ou supprimés.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });

    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setDescription('`✅` Les rôles ont été mis à jour !')
          .setColor(Colors.Green),
      ],
      ephemeral: true,
    });

    setTimeout(() => interaction.deleteReply(), 3_000);
  },
);

module.exports = [roleSelect];
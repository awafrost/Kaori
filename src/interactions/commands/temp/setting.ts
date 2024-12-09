import { ChatInput } from '@akki256/discord-interaction';
import { dashboard } from '@const/links';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'setting',
    description: 'Change the bot settings',
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Bot settings have moved to the dashboard')
          .setDescription(
            `Kaori settings can now be configured via the [**Web Dashboard**](${dashboard})! This command will be removed in the next version and will no longer be available.`,
          )
          .setColor(Colors.Blurple),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents([
          new ButtonBuilder()
            .setLabel('Dashboard')
            .setURL(`${dashboard}/guilds/${interaction.guild.id}`)
            .setStyle(ButtonStyle.Link),
        ]),
      ],
      ephemeral: true,
    });
  },
);
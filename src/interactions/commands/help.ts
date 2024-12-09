import { ChatInput } from '@akki256/discord-interaction';
import { dashboard, document, supportServer } from '@const/links';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'help',
    description: 'Information about this BOT',
  },
  async (interaction) => {
    const developer =
      await interaction.client.users.fetch('499447456678019072');

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(interaction.client.user.username)
          .setDescription(
            [
              '**Make your Discord server more convenient!**',
              'We are continuously developing a "user-friendly multi-functional BOT".',
            ].join('\n'),
          )
          .setColor(Colors.Blurple)
          .setFooter({
            text: `Developer: @${developer.username}`,
            iconURL: developer.displayAvatarURL(),
          }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL(supportServer),
          new ButtonBuilder()
            .setLabel('User Guide')
            .setStyle(ButtonStyle.Link)
            .setURL(document),
          new ButtonBuilder()
            .setLabel('Dashboard')
            .setStyle(ButtonStyle.Link)
            .setURL(dashboard),
        ),
      ],
      ephemeral: true,
    });
  },
);
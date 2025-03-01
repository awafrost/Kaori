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
    description: 'Informations sur Kaori',
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
              '**Rendez votre serveur Discord plus pratique !**',
              'Nous développons continuellement un "BOT multifonctionnel convivial".',
            ].join('\n'),
          )
          .setColor(Colors.Blurple)
          .setFooter({
            text: `Développeur : @${developer.username}`,
            iconURL: developer.displayAvatarURL(),
          }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setLabel('Serveur de support')
            .setStyle(ButtonStyle.Link)
            .setURL(supportServer),
          new ButtonBuilder()
            .setLabel('Guide utilisateur')
            .setStyle(ButtonStyle.Link)
            .setURL(document),
          new ButtonBuilder()
            .setLabel('Tableau de bord')
            .setStyle(ButtonStyle.Link)
            .setURL(dashboard),
        ),
      ],
      ephemeral: true,
    });
  },
);
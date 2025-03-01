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
    description: 'Modifier les paramètres du bot',
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Les paramètres du bot ont été déplacés vers le tableau de bord')
          .setDescription(
            `Les paramètres de Kaori peuvent désormais être configurés via le [**Tableau de bord web**](${dashboard}) ! Cette commande sera supprimée dans la prochaine version et ne sera plus disponible.`,
          )
          .setColor(Colors.Blurple),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents([
          new ButtonBuilder()
            .setLabel('Tableau de bord')
            .setURL(`${dashboard}/guilds/${interaction.guild.id}`)
            .setStyle(ButtonStyle.Link),
        ]),
      ],
      ephemeral: true,
    });
  },
);
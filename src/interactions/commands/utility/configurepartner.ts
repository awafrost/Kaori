import { ChatInput } from '@akki256/discord-interaction';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default new ChatInput(
  {
    name: 'configurepartner',
    description: 'Configurer le salon de partenariat et les paramètres',
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  },
  { coolTime: 5000 },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('base_config')
        .setLabel('Configuration de Base')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('advanced_config')
        .setLabel('Configuration Avancée')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Configurer le partenariat')
          .setDescription('Cliquez sur un bouton pour configurer les paramètres :')
          .setColor(Colors.Green),
      ],
      components: [row],
      ephemeral: true,
    });
  },
);
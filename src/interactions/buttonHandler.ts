import { Button } from '@akki256/discord-interaction';
import { GuildConfig } from '@models';
import {
  ActionRowBuilder,
  Colors,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

// Button handler for "base_config"
const baseConfigButton = new Button(
  { customId: 'base_config' },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const modal = new ModalBuilder()
      .setCustomId('base_config_modal')
      .setTitle('Configuration de Base')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('channel')
            .setLabel('Salon de partenariat')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Entrez l'ID du salon")
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('minmembers')
            .setLabel('Nombre minimum de membres requis')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Entrez le nombre minimum de membres')
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('cmrole')
            .setLabel('Rôle CM')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Entrez l'ID du rôle CM")
            .setRequired(true),
        ),
      );

    await interaction.showModal(modal);
  },
);

// Button handler for "advanced_config"
const advancedConfigButton = new Button(
  { customId: 'advanced_config' },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const modal = new ModalBuilder()
      .setCustomId('advanced_config_modal')
      .setTitle('Configuration Avancée')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('embedtitle')
            .setLabel("Titre de l'embed")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Entrez le titre de l'embed")
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('embeddescription')
            .setLabel("Description de l'embed")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Entrez la description de l'embed")
            .setRequired(true),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('embedimage')
            .setLabel("URL de l'image de l'embed (optionnel)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Entrez l'URL de l'image (optionnel)")
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('thumbnail')
            .setLabel("URL du thumbnail de l'embed (optionnel)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Entrez l'URL du thumbnail (optionnel)")
            .setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('mentionrole')
            .setLabel('Rôle à mentionner')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Entrez l'ID du rôle à mentionner (optionnel)")
            .setRequired(false),
        ),
      );

    await interaction.showModal(modal);
  },
);

module.exports = [baseConfigButton, advancedConfigButton];
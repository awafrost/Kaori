import { DiscordEventBuilder } from '@modules/events';
import { GuildConfig } from '@models';
import {
  ActionRowBuilder,
  ButtonInteraction,
  Colors,
  EmbedBuilder,
  Events,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;

    // Handle Button Interactions
    if (interaction.isButton()) {
      if (interaction.customId === 'base_config') {
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
      } else if (interaction.customId === 'advanced_config') {
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
      }
    }

    // Handle Modal Submissions
    if (interaction.isModalSubmit()) {
      const guildId = interaction.guild.id;

      if (interaction.customId === 'base_config_modal') {
        const channelId = interaction.fields.getTextInputValue('channel');
        const minMembers = parseInt(interaction.fields.getTextInputValue('minmembers'), 10);
        const cmRoleId = interaction.fields.getTextInputValue('cmrole');

        let config = await GuildConfig.findOne({ guildId });
        if (!config) {
          config = new GuildConfig({
            guildId,
            channelId,
            minMembersRequired: minMembers,
            cmRoleId,
          });
        } else {
          config.channelId = channelId;
          config.minMembersRequired = minMembers;
          config.cmRoleId = cmRoleId;
        }

        await config.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Configuration de Base')
              .setDescription(
                `Salon: <#${channelId}>\nMin Membres: ${minMembers}\nRôle CM: <@&${cmRoleId}>`,
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      } else if (interaction.customId === 'advanced_config_modal') {
        const embedTitle = interaction.fields.getTextInputValue('embedtitle');
        const embedDescription = interaction.fields.getTextInputValue('embeddescription');
        const embedImage = interaction.fields.getTextInputValue('embedimage') || null;
        const thumbnail = interaction.fields.getTextInputValue('thumbnail') || null;
        const mentionRoleId = interaction.fields.getTextInputValue('mentionrole') || null;

        let config = await GuildConfig.findOne({ guildId });
        if (!config) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Erreur')
                .setDescription('Aucune configuration trouvée. Veuillez d\'abord configurer les paramètres de base.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        // Initialize embedConfig if undefined
        config.embedConfig = config.embedConfig || {
          title: null,
          description: null,
          image: null,
          thumbnail: null,
          mentionRoleId: null,
        };
        config.embedConfig.title = embedTitle;
        config.embedConfig.description = embedDescription;
        config.embedConfig.image = embedImage;
        config.embedConfig.thumbnail = thumbnail;
        config.embedConfig.mentionRoleId = mentionRoleId;

        await config.save();

        const channel = await interaction.client.channels.fetch(config.channelId!);
        if (channel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setDescription(embedDescription)
            .setImage(embedImage)
            .setThumbnail(thumbnail)
            .setColor(Colors.DarkGrey);

          if (mentionRoleId) {
            embed.addFields({ name: 'Rôle à Mentionner', value: `<@&${mentionRoleId}>` });
          }

          await channel.send({ embeds: [embed] });
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Configuration Avancée')
              .setDescription('La configuration avancée a été mise à jour et affichée dans le salon de partenariat.')
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      }
    }
  },
});
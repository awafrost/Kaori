import { Modal } from '@akki256/discord-interaction';
import { GuildConfig } from '@models';
import { Colors, EmbedBuilder } from 'discord.js';

const baseConfigModal = new Modal(
  { customId: 'base_config_modal' },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const channelId = interaction.fields.getTextInputValue('channel');
    const minMembers = parseInt(interaction.fields.getTextInputValue('minmembers'), 10);
    const cmRoleId = interaction.fields.getTextInputValue('cmrole');

    let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (!config) {
      config = new GuildConfig({
        guildId: interaction.guild.id,
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
            `\`✅\` Configuration mise à jour :\n- Salon: <#${channelId}>\n- Min Membres: ${minMembers}\n- Rôle CM: <@&${cmRoleId}>`,
          )
          .setColor(Colors.Green),
      ],
      ephemeral: true,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 3000); // Match your style
  },
);

const advancedConfigModal = new Modal(
  { customId: 'advanced_config_modal' },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const embedTitle = interaction.fields.getTextInputValue('embedtitle');
    const embedDescription = interaction.fields.getTextInputValue('embeddescription');
    const embedImage = interaction.fields.getTextInputValue('embedimage') || null;
    const thumbnail = interaction.fields.getTextInputValue('thumbnail') || null;
    const mentionRoleId = interaction.fields.getTextInputValue('mentionrole') || null;

    let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (!config) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Erreur')
            .setDescription(
              `\`❌\` Aucune configuration trouvée. Veuillez d'abord configurer les paramètres de base.`,
            )
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

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
          .setDescription(
            `\`✅\` La configuration avancée a été mise à jour et affichée dans le salon de partenariat.`,
          )
          .setColor(Colors.Green),
      ],
      ephemeral: true,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 3000); // Match your style
  },
);

module.exports = [baseConfigModal, advancedConfigModal];
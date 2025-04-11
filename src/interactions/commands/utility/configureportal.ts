import { ChatInput } from '@akki256/discord-interaction';
import { GuildConfig } from '@models';
import { ApplicationCommandOptionType, Colors, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default new ChatInput(
  {
    name: 'configureportal',
    description: 'Configurer les alertes et la catégorie pour les portails',
    options: [
      {
        name: 'category',
        description: 'ID de la catégorie pour ce portail',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'threshold',
        description: 'Seuil de membres pour passer à la catégorie suivante',
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: 'alertuser',
        description: 'Utilisateur à alerter en cas d\'invitation invalide',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'title',
        description: 'Titre pour l\'embed',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'description',
        description: 'Description pour l\'embed',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  },
  { coolTime: 5000 },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const categoryId = interaction.options.getString('category', true);
    const threshold = interaction.options.getInteger('threshold', true);
    const alertUser = interaction.options.getUser('alertuser', true);
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);

    let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (!config) {
      config = new GuildConfig({
        guildId: interaction.guild.id,
        categoryId,
        memberThreshold: threshold,
        alertUserIds: [alertUser.id],
        embedConfig: { title, description, image: null, thumbnail: null, mentionRoleId: null },
      });
    } else {
      config.categoryId = categoryId;
      config.memberThreshold = threshold;
      config.alertUserIds = config.alertUserIds || [];
      if (!config.alertUserIds.includes(alertUser.id)) {
        config.alertUserIds.push(alertUser.id);
      }
      // Initialize embedConfig if undefined
      config.embedConfig = config.embedConfig || {
        title: null,
        description: null,
        image: null,
        thumbnail: null,
        mentionRoleId: null,
      };
      config.embedConfig.title = title;
      config.embedConfig.description = description;
    }

    await config.save();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Configuration mise à jour')
          .setDescription('Les paramètres du portail ont été mis à jour avec succès.')
          .addFields(
            { name: 'Catégorie', value: categoryId, inline: true },
            { name: 'Seuil de Membres', value: threshold.toString(), inline: true },
            { name: 'Utilisateur Alerté', value: alertUser.tag, inline: true },
            { name: 'Titre de l\'Embed', value: title, inline: true },
            { name: 'Description de l\'Embed', value: description, inline: true },
          )
          .setColor(Colors.Green),
      ],
      ephemeral: true,
    });
  },
);
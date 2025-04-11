import { ChatInput } from '@akki256/discord-interaction';
import { Blacklist, GuildConfig } from '@models';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'partnership',
    description: 'Gérer les partenariats et la liste noire du serveur',
    options: [
      {
        name: 'blacklist',
        description: 'Gérer la liste noire des serveurs',
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [
          {
            name: 'view',
            description: 'Afficher la liste des serveurs blacklistés',
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            name: 'add',
            description: 'Ajouter un serveur à la liste noire',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'serverid',
                description: 'ID du serveur à blacklister',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: 'reason',
                description: 'Raison du blacklist',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
            ],
          },
          {
            name: 'remove',
            description: 'Retirer un serveur de la liste noire',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'serverid',
                description: 'ID du serveur à retirer de la liste noire',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
            ],
          },
        ],
      },
      {
        name: 'configure',
        description: 'Configurer les paramètres de partenariat',
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [
          {
            name: 'partner',
            description: 'Configurer le salon de partenariat et les paramètres',
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            name: 'portal',
            description: 'Configurer les alertes et la catégorie pour les portails',
            type: ApplicationCommandOptionType.Subcommand,
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
          },
        ],
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  },
  { coolTime: 5000 },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    // Group: blacklist
    if (subcommandGroup === 'blacklist') {
      // Subcommand: view
      if (subcommand === 'view') {
        const blacklist = await Blacklist.find({ guildId: interaction.guild.id });

        if (blacklist.length === 0) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Liste des serveurs blacklistés')
                .setDescription('Aucun serveur n\'est actuellement blacklisté.')
                .setColor(Colors.DarkGrey),
            ],
            ephemeral: true,
          });
          return;
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Serveurs blacklistés')
              .setDescription(
                blacklist
                  .map(
                    (entry) =>
                      `**Serveur ID:** ${entry.blacklistedServerId}\n**Raison:** ${entry.reason}`,
                  )
                  .join('\n\n'),
              )
              .setColor(Colors.DarkGrey)
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // Subcommand: add
      else if (subcommand === 'add') {
        const serverId = interaction.options.getString('serverid', true);
        const reason = interaction.options.getString('reason', true);

        const existingEntry = await Blacklist.findOne({
          guildId: interaction.guild.id,
          blacklistedServerId: serverId,
        });

        if (existingEntry) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Serveur déjà blacklisté')
                .setDescription(`Le serveur \`${serverId}\` est déjà dans la liste noire.`)
                .addFields({ name: 'Raison', value: existingEntry.reason })
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const blacklistEntry = new Blacklist({
          guildId: interaction.guild.id,
          blacklistedServerId: serverId,
          reason,
          blacklistedBy: interaction.user.id,
        });

        await blacklistEntry.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Serveur ajouté à la blacklist')
              .setDescription(`Le serveur \`${serverId}\` a été ajouté à la liste noire.`)
              .addFields({ name: 'Raison', value: reason })
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      }

      // Subcommand: remove
      else if (subcommand === 'remove') {
        const serverId = interaction.options.getString('serverid', true);

        const blacklistEntry = await Blacklist.findOne({
          guildId: interaction.guild.id,
          blacklistedServerId: serverId,
        });

        if (!blacklistEntry) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Serveur non trouvé')
                .setDescription(`Le serveur \`${serverId}\` n'est pas dans la liste noire.`)
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        await Blacklist.deleteOne({
          guildId: interaction.guild.id,
          blacklistedServerId: serverId,
        });

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Serveur retiré de la blacklist')
              .setDescription(`Le serveur \`${serverId}\` a été retiré de la liste noire.`)
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      }
    }

    // Group: configure
    else if (subcommandGroup === 'configure') {
      // Subcommand: partner
      if (subcommand === 'partner') {
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
      }

      // Subcommand: portal
      else if (subcommand === 'portal') {
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
      }
    }
  },
);
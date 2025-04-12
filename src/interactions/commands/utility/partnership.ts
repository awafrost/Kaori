import { ChatInput } from '@akki256/discord-interaction';
import { Blacklist, GuildConfig, MonitoredMessage, Partnership } from '@models';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

// Interface pour typer les documents Partnership
interface PartnershipDocument {
  guildId: string;
  partnerGuildId: string;
  userId: string;
  createdAt: Date;
  messageId?: string;
}

// Liste des IDs autorisés pour la blacklist globale
const GLOBAL_BLACKLIST_AUTHORIZED_IDS = ['499447456678019072', '1055998924206379099'];

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
          {
            name: 'globaladd',
            description: 'Ajouter un serveur à la blacklist globale (réservé)',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'serverid',
                description: 'ID du serveur à blacklister globalement',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: 'reason',
                description: 'Raison du blacklist global',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
            ],
          },
          {
            name: 'globalremove',
            description: 'Retirer un serveur de la blacklist globale (réservé)',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'serverid',
                description: 'ID du serveur à retirer de la blacklist globale',
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
            description: 'Configurer le salon de partenariat',
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
                description: 'Utilisateur à alerter pour les invitations invalides',
                type: ApplicationCommandOptionType.User,
                required: true,
              },
              {
                name: 'title',
                description: "Titre pour l'embed",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: 'description',
                description: "Description pour l'embed",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
            ],
          },
        ],
      },
      {
        name: 'stats',
        description: 'Voir les statistiques des partenariats',
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [
          {
            name: 'leaderboard',
            description: 'Afficher le classement des partenariats',
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            name: 'user',
            description: "Voir les stats d'un utilisateur sur ce serveur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'user',
                description: 'Utilisateur à analyser',
                type: ApplicationCommandOptionType.User,
                required: true,
              },
            ],
          },
          {
            name: 'global',
            description: "Voir tous les partenariats d'un utilisateur",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'user',
                description: 'Utilisateur à analyser',
                type: ApplicationCommandOptionType.User,
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
      if (subcommand === 'view') {
        const blacklist = await Blacklist.find({
          $or: [{ guildId: interaction.guild.id }, { isGlobal: true }],
        });

        if (blacklist.length === 0) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Liste des serveurs blacklistés')
                .setDescription("Aucun serveur n'est actuellement blacklisté.")
                .setColor(Colors.DarkGrey),
            ],
            ephemeral: true,
          });
          return;
        }

        const guildDescriptions = await Promise.all(
          blacklist.map(async (entry) => {
            let guildName: string | null = null;
            try {
              const guild = await interaction.client.guilds.fetch(entry.blacklistedServerId);
              guildName = guild.name;
            } catch {
              guildName = 'Nom inconnu';
            }
            return `**Serveur:** ${guildName} (\`${entry.blacklistedServerId}\`)\n**Raison:** ${entry.reason}\n**Global:** ${
              entry.isGlobal ? 'Oui' : 'Non'
            }`;
          }),
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Serveurs blacklistés')
              .setDescription(guildDescriptions.join('\n\n'))
              .setColor(Colors.DarkGrey)
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      } else if (subcommand === 'add') {
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
      } else if (subcommand === 'remove') {
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
      } else if (subcommand === 'globaladd') {
        if (!GLOBAL_BLACKLIST_AUTHORIZED_IDS.includes(interaction.user.id)) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Permission refusée')
                .setDescription("Vous n'êtes pas autorisé à ajouter une blacklist globale.")
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const serverId = interaction.options.getString('serverid', true);
        const reason = interaction.options.getString('reason', true);

        const existingEntry = await Blacklist.findOne({
          blacklistedServerId: serverId,
          isGlobal: true,
        });

        if (existingEntry) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Serveur déjà blacklisté globalement')
                .setDescription(`Le serveur \`${serverId}\` est déjà dans la blacklist globale.`)
                .addFields({ name: 'Raison', value: existingEntry.reason })
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const blacklistEntry = new Blacklist({
          blacklistedServerId: serverId,
          reason,
          blacklistedBy: interaction.user.id,
          isGlobal: true,
        });

        await blacklistEntry.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Serveur ajouté à la blacklist globale')
              .setDescription(`Le serveur \`${serverId}\` a été ajouté à la blacklist globale.`)
              .addFields({ name: 'Raison', value: reason })
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      } else if (subcommand === 'globalremove') {
        if (!GLOBAL_BLACKLIST_AUTHORIZED_IDS.includes(interaction.user.id)) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Permission refusée')
                .setDescription("Vous n'êtes pas autorisé à retirer une blacklist globale.")
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const serverId = interaction.options.getString('serverid', true);

        const blacklistEntry = await Blacklist.findOne({
          blacklistedServerId: serverId,
          isGlobal: true,
        });

        if (!blacklistEntry) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Serveur non trouvé')
                .setDescription(`Le serveur \`${serverId}\` n'est pas dans la blacklist globale.`)
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        await Blacklist.deleteOne({
          blacklistedServerId: serverId,
          isGlobal: true,
        });

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Serveur retiré de la blacklist globale')
              .setDescription(`Le serveur \`${serverId}\` a été retiré de la blacklist globale.`)
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      }
    }
    // Group: configure
    else if (subcommandGroup === 'configure') {
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
      } else if (subcommand === 'portal') {
        const categoryId = interaction.options.getString('category', true);
        const threshold = interaction.options.getInteger('threshold', true);
        const alertUser = interaction.options.get('alertuser', true);
        const title = interaction.options.getString('title', false) || 'Default Title';
        const description = interaction.options.getString('description', false) || 'Default Description';

        if (!alertUser.user) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Erreur')
                .setDescription("L'utilisateur spécifié pour l'alerte est invalide.")
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
          config = new GuildConfig({
            guildId: interaction.guild.id,
            categoryId,
            memberThreshold: threshold,
            alertUserIds: [alertUser.user.id],
            embedConfig: { title, description, image: null, thumbnail: null, mentionRoleId: null },
          });
        } else {
          config.categoryId = categoryId;
          config.memberThreshold = threshold;
          config.alertUserIds = config.alertUserIds || [];
          if (!config.alertUserIds.includes(alertUser.user.id)) {
            config.alertUserIds.push(alertUser.user.id);
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
                { name: 'Utilisateur Alerté', value: alertUser.user.tag, inline: true },
                { name: "Titre de l'Embed", value: title, inline: true },
                { name: "Description de l'Embed", value: description, inline: true },
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      }
    }
    // Group: stats
    else if (subcommandGroup === 'stats') {
      if (subcommand === 'leaderboard') {
        const partnerships = await Partnership.aggregate([
          { $match: { guildId: interaction.guild.id } },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]);

        if (partnerships.length === 0) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Classement des partenariats')
                .setDescription("Aucun partenariat n'a été enregistré sur ce serveur.")
                .setColor(Colors.DarkGrey),
            ],
            ephemeral: true,
          });
          return;
        }

        const leaderboard = await Promise.all(
          partnerships.map(async (entry: { _id: string; count: number }, index: number) => {
            const user = await interaction.client.users.fetch(entry._id).catch(() => null);
            return `${index + 1}. **${user?.tag || 'Utilisateur inconnu'}** - ${entry.count} partenariats`;
          }),
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Classement des partenariats')
              .setDescription(leaderboard.join('\n'))
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      } else if (subcommand === 'user') {
        const user = interaction.options.get('user', true);

        if (!user.user) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Erreur')
                .setDescription("L'utilisateur spécifié est invalide.")
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const partnerships = await Partnership.find({
          guildId: interaction.guild.id,
          userId: user.user.id,
        });

        if (partnerships.length === 0) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Statistiques de ${user.user.tag}`)
                .setDescription(`${user.user.tag} n'a effectué aucun partenariat sur ce serveur.`)
                .setColor(Colors.DarkGrey),
            ],
            ephemeral: true,
          });
          return;
        }

        const partnerGuilds = await Promise.all(
          partnerships.map(async (p: PartnershipDocument) => {
            const guild = await interaction.client.guilds.fetch(p.partnerGuildId).catch(() => null);
            return guild?.name || p.partnerGuildId;
          }),
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`Statistiques de ${user.user.tag}`)
              .setDescription(
                `${user.user.tag} a effectué **${partnerships.length}** partenariats sur ce serveur.\n\n**Serveurs partenaires :**\n${partnerGuilds.join(
                  '\n',
                )}`,
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      } else if (subcommand === 'global') {
        const user = interaction.options.get('user', true);

        if (!user.user) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Erreur')
                .setDescription("L'utilisateur spécifié est invalide.")
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const partnerships = await Partnership.find({ userId: user.user.id });

        if (partnerships.length === 0) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Partenariats globaux de ${user.user.tag}`)
                .setDescription(`${user.user.tag} n'a effectué aucun partenariat.`)
                .setColor(Colors.DarkGrey),
            ],
            ephemeral: true,
          });
          return;
        }

        const guildStats = await Promise.all(
          partnerships.map(async (p: PartnershipDocument) => {
            const guild = await interaction.client.guilds.fetch(p.guildId).catch(() => null);
            const partnerGuild = await interaction.client.guilds.fetch(p.partnerGuildId).catch(() => null);
            return `**Serveur:** ${guild?.name || p.guildId}\n**Partenaire:** ${partnerGuild?.name || p.partnerGuildId}`;
          }),
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`Partenariats globaux de ${user.user.tag}`)
              .setDescription(
                `${user.user.tag} a effectué **${partnerships.length}** partenariats au total.\n\n${guildStats.join('\n\n')}`,
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      }
    }
  },
);
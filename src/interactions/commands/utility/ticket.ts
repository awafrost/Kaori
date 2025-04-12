import { ChatInput } from '@akki256/discord-interaction';
import { TicketConfig, TicketTranscript } from '@models';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'ticket',
    description: 'Gérer le système de tickets',
    options: [
      {
        name: 'config',
        description: 'Configurer le système de tickets',
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [
          {
            name: 'setup',
            description: 'Configurer le salon, la catégorie et l\'embed des tickets',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'channel',
                description: 'Salon où envoyer l\'embed des tickets',
                type: ApplicationCommandOptionType.Channel,
                channelTypes: [ChannelType.GuildText],
                required: true,
              },
              {
                name: 'category',
                description: 'Catégorie où créer les tickets',
                type: ApplicationCommandOptionType.Channel,
                channelTypes: [ChannelType.GuildCategory],
                required: true,
              },
              {
                name: 'embed_title',
                description: 'Titre de l\'embed des tickets',
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: 'embed_description',
                description: 'Description de l\'embed des tickets',
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: 'embed_color',
                description: 'Couleur de l\'embed (code hexadécimal, ex. #FF0000)',
                type: ApplicationCommandOptionType.String,
                required: false,
              },
            ],
          },
          {
            name: 'send',
            description: 'Envoyer l\'embed des tickets dans le salon configuré',
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
      {
        name: 'button',
        description: 'Gérer les boutons de tickets',
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [
          {
            name: 'add',
            description: 'Ajouter un bouton pour créer un ticket',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'label',
                description: 'Texte du bouton',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: 'emoji',
                description: 'Emoji du bouton (ex. 📩 ou <:nom:ID>)',
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: 'style',
                description: 'Couleur du bouton',
                type: ApplicationCommandOptionType.String,
                choices: [
                  { name: 'Bleu', value: 'primary' },
                  { name: 'Gris', value: 'secondary' },
                  { name: 'Vert', value: 'success' },
                ],
                required: false,
              },
              {
                name: 'title',
                description: 'Titre de l\'embed du ticket',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: 'description',
                description: 'Description de l\'embed du ticket',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
            ],
          },
        ],
      },
      {
        name: 'premium',
        description: 'Gérer les fonctionnalités premium',
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [
          {
            name: 'enable',
            description: 'Activer les fonctionnalités premium pour ce serveur',
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            name: 'transcript',
            description: 'Voir la transcription d\'un ticket',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'ticket_id',
                description: 'ID du salon du ticket',
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
    const MAIN_SERVER_ID = 'YOUR_MAIN_SERVER_ID'; // Remplacer par l'ID de votre serveur
    const PREMIUM_ROLE_ID = 'YOUR_PREMIUM_ROLE_ID'; // Remplacer par l'ID du rôle premium

    // Groupe : config
    if (subcommandGroup === 'config') {
      // Sous-commande : setup
      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('channel', true);
        const category = interaction.options.getChannel('category', true);
        const embedTitle = interaction.options.getString('embed_title');
        const embedDescription = interaction.options.getString('embed_description');
        const embedColor = interaction.options.getString('embed_color');

        if (!channel.isTextBased()) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Le salon doit être un salon textuel.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }
        if (category.type !== ChannelType.GuildCategory) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` La catégorie doit être une catégorie de salons.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        let config = await TicketConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
          config = new TicketConfig({
            guildId: interaction.guild.id,
            ticketChannelId: channel.id,
            ticketCategoryId: category.id,
            ticketButtons: [],
            embedTitle: embedTitle || 'Ouvrir un Ticket',
            embedDescription:
              embedDescription || 'Cliquez sur un bouton pour créer un ticket.',
            embedColor: embedColor || '#5865F2',
          });
        } else {
          config.ticketChannelId = channel.id;
          config.ticketCategoryId = category.id;
          config.embedTitle = embedTitle || config.embedTitle || 'Ouvrir un Ticket';
          config.embedDescription =
            embedDescription ||
            config.embedDescription ||
            'Cliquez sur un bouton pour créer un ticket.';
          config.embedColor = embedColor || config.embedColor || '#5865F2';
        }

        await config.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `\`✅\` Configuration des tickets mise à jour :\n- Salon : <#${channel.id}>\n- Catégorie : ${category.name}`,
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }

      // Sous-commande : send
      else if (subcommand === 'send') {
        const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
        if (!config?.ticketChannelId || !config.ticketButtons.length) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  '`❌` Configurez d\'abord le salon et ajoutez au moins un bouton.',
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const channel = await interaction.client.channels.fetch(
          config.ticketChannelId,
        );
        if (!channel?.isTextBased()) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Le salon configuré n\'est pas textuel.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const styleMap: Record<string, ButtonStyle> = {
          primary: ButtonStyle.Primary,
          secondary: ButtonStyle.Secondary,
          success: ButtonStyle.Success,
        };

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          config.ticketButtons.map((btn) => {
            const button = new ButtonBuilder()
              .setCustomId(btn.customId)
              .setLabel(btn.label)
              .setStyle(btn.style ? styleMap[btn.style] : ButtonStyle.Primary);
            if (btn.emoji) button.setEmoji(btn.emoji);
            return button;
          }),
        );

        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(config.embedTitle ?? null)
              .setDescription(config.embedDescription ?? null)
              .setColor((config.embedColor as any) || Colors.Blurple),
          ],
          components: [row],
        });

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription('`✅` Embed des tickets envoyé dans le salon configuré.')
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }
    }

    // Groupe : button
    else if (subcommandGroup === 'button') {
      // Sous-commande : add
      if (subcommand === 'add') {
        const label = interaction.options.getString('label', true);
        const emoji = interaction.options.getString('emoji');
        const rawStyle = interaction.options.getString('style');
        const title = interaction.options.getString('title', true);
        const description = interaction.options.getString('description', true);

        // Validate the style to match the allowed enum values
        const validStyles = ['primary', 'secondary', 'success'] as const;
        const style: 'primary' | 'secondary' | 'success' | undefined = rawStyle &&
          validStyles.includes(rawStyle as any) // Temporary cast to bypass TS issue
          ? rawStyle as 'primary' | 'secondary' | 'success'
          : undefined;

        let config = await TicketConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  '`❌` Veuillez d\'abord configurer le système avec `/ticket config setup`.',
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const isPremium =
          config.premiumUserId &&
          (await checkPremium(interaction, MAIN_SERVER_ID, PREMIUM_ROLE_ID));
        const maxButtons = isPremium ? 5 : 3;
        if (config.ticketButtons.length >= maxButtons) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `\`❌\` Limite de boutons atteinte (${maxButtons}). ${
                    isPremium ? '' : 'Activez le premium pour ajouter plus de boutons.'
                  }`,
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const customId = `ticket_create_${config.ticketButtons.length}_${Date.now()}`;
        config.ticketButtons.push({
          label,
          customId,
          emoji,
          style,
          embedTitle: title,
          embedDescription: description,
        });

        await config.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`\`✅\` Bouton ajouté : "${label}"`)
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }
    }

    // Groupe : premium
    else if (subcommandGroup === 'premium') {
      // Sous-commande : enable
      if (subcommand === 'enable') {
        const hasPremium = await checkPremium(
          interaction,
          MAIN_SERVER_ID,
          PREMIUM_ROLE_ID,
        );
        if (!hasPremium) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  '`❌` Vous devez avoir le rôle premium sur le serveur principal pour activer cette fonctionnalité.',
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        let config = await TicketConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
          config = new TicketConfig({
            guildId: interaction.guild.id,
            premiumUserId: interaction.user.id,
            ticketButtons: [],
          });
        } else if (
          config.premiumUserId &&
          config.premiumUserId !== interaction.user.id
        ) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  '`❌` Le premium est déjà activé par un autre utilisateur sur ce serveur.',
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        } else {
          config.premiumUserId = interaction.user.id;
        }

        const otherConfig = await TicketConfig.findOne({
          premiumUserId: interaction.user.id,
          guildId: { $ne: interaction.guild.id },
        });
        if (otherConfig) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  '`❌` Vous avez déjà activé le premium sur un autre serveur.',
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        await config.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription('`✅` Fonctionnalités premium activées pour ce serveur.')
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }

      // Sous-commande : transcript
      else if (subcommand === 'transcript') {
        const ticketId = interaction.options.getString('ticket_id', true);

        const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
        if (
          !config?.premiumUserId ||
          !(await checkPremium(interaction, MAIN_SERVER_ID, PREMIUM_ROLE_ID))
        ) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  '`❌` Cette fonctionnalité nécessite un abonnement premium.',
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const transcript = await TicketTranscript.findOne({
          guildId: interaction.guild.id,
          ticketId,
        });

        if (!transcript) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Aucune transcription trouvée pour ce ticket.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const messages = transcript.messages
          .map(
            (msg) =>
              `[${new Date(msg.timestamp).toLocaleString()}] <@${
                msg.authorId
              }>: ${msg.content}`,
          )
          .join('\n');

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`Transcription du Ticket ${ticketId}`)
              .setDescription(messages || 'Aucun message enregistré.')
              .setColor(Colors.Blurple),
          ],
          ephemeral: true,
        });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }
    }
  },
);

async function checkPremium(
  interaction: any,
  mainServerId: string,
  premiumRoleId: string,
) {
  try {
    const mainGuild = await interaction.client.guilds.fetch(mainServerId);
    const member = await mainGuild.members.fetch(interaction.user.id);
    return member.roles.cache.has(premiumRoleId);
  } catch {
    return false;
  }
}
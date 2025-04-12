import { ChatInput } from '@akki256/discord-interaction';
import { TicketConfig } from '@models';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  Client,
  Interaction,
  StringSelectMenuInteraction,
} from 'discord.js';

async function resolveEmoji(input: string, guild: any): Promise<string | null> {
  // Cas 1 : Emoji Unicode (ex. 📩)
  if (/^[\p{Emoji_Presentation}\p{Emoji}\uFE0F]+$/u.test(input)) {
    return input;
  }

  // Cas 2 : Format Discord <:nom:ID> ou <a:nom:ID>
  const discordEmojiMatch = input.match(/^<a?:([^\s:]+):(\d+)>$/);
  if (discordEmojiMatch) {
    return discordEmojiMatch[2]; // Retourne l'ID
  }

  // Cas 3 : Nom brut (ex. :zorangetasses:)
  const nameMatch = input.match(/^:([^\s:]+):$/);
  if (nameMatch) {
    const emojiName = nameMatch[1];
    const emoji = guild.emojis.cache.find((e: any) => e.name === emojiName);
    return emoji ? emoji.id : null;
  }

  // Cas 4 : ID brut
  if (/^\d+$/.test(input)) {
    const emoji = guild.emojis.cache.get(input);
    return emoji ? input : null;
  }

  return null;
}

// Export the client for use in buttonHandlers.ts
export let clientInstance: Client;

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
            description: "Configurer le salon, la catégorie et l'embed des tickets",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: 'channel',
                description: "Salon où envoyer l'embed des tickets",
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
                description: "Titre de l'embed des tickets",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: 'embed_description',
                description: "Description de l'embed des tickets",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: 'embed_color',
                description: 'Couleur de l\'embed (code hexadécimal, ex. #FF0000)',
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: 'embed_image',
                description: "URL de l'image pour l'embed (ex. https://example.com/image.png)",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
            ],
          },
          {
            name: 'send',
            description: "Envoyer l'embed des tickets dans le salon configuré",
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            name: 'status',
            description: 'Voir la configuration actuelle du système de tickets',
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            name: 'remove',
            description: 'Supprimer un bouton de ticket configuré',
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
                name: 'emoji',
                description: 'Emoji du bouton (ex. 📩, :nom:, ou <:nom:ID>)',
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: 'description',
                description: "Description de l'embed du ticket",
                type: ApplicationCommandOptionType.String,
                required: true,
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
                description: "Titre de l'embed du ticket (optionnel)",
                type: ApplicationCommandOptionType.String,
                required: false,
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

    // Groupe : config
    if (subcommandGroup === 'config') {
      // Sous-commande : setup
      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('channel', true);
        const category = interaction.options.getChannel('category', true);
        const embedTitle = interaction.options.getString('embed_title');
        const embedDescription = interaction.options.getString('embed_description');
        const embedColor = interaction.options.getString('embed_color');
        const embedImage = interaction.options.getString('embed_image');

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

        // Validate embed_image if provided
        if (embedImage && !/^https?:\/\/.*\.(png|jpg|jpeg|gif)$/i.test(embedImage)) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` L\'URL de l\'image doit être un lien valide vers une image (png, jpg, jpeg, gif).')
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
            embedColor: embedColor || '#131416',
            embedImage: embedImage || undefined,
          });
        } else {
          config.ticketChannelId = channel.id;
          config.ticketCategoryId = category.id;
          config.embedTitle = embedTitle || config.embedTitle || 'Ouvrir un Ticket';
          config.embedDescription =
            embedDescription ||
            config.embedDescription ||
            'Cliquez sur un bouton pour créer un ticket.';
          config.embedColor = embedColor || config.embedColor || '#131416';
          config.embedImage = embedImage || config.embedImage || undefined;
        }

        await config.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `\`✅\` Configuration des tickets mise à jour :\n- Salon : <#${channel.id}>\n- Catégorie : ${category.name}` +
                (embedImage ? `\n- Image : ${embedImage}` : ''),
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

        const buttons = [];
        for (const btn of config.ticketButtons) {
          const emojiId = await resolveEmoji(btn.emoji, interaction.guild);
          if (!emojiId) {
            console.warn(`Emoji invalide pour le bouton ${btn.customId}: ${btn.emoji}`);
            continue;
          }

          const button = new ButtonBuilder()
            .setCustomId(btn.customId)
            .setStyle(btn.style ? styleMap[btn.style] : ButtonStyle.Primary)
            .setEmoji(emojiId);
          buttons.push(button);
        }

        if (!buttons.length) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Aucun bouton valide trouvé.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

        const embed = new EmbedBuilder()
          .setTitle(config.embedTitle ?? null)
          .setDescription(config.embedDescription ?? null)
          .setColor((config.embedColor as any) || Colors.Blurple);

        if (config.embedImage) {
          embed.setImage(config.embedImage);
        }

        await channel.send({
          embeds: [embed],
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

      // Sous-commande : status
      else if (subcommand === 'status') {
        const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Aucune configuration trouvée. Utilisez `/ticket config setup` pour commencer.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const buttons = config.ticketButtons.length
          ? config.ticketButtons
              .map((btn) =>
                btn.emoji
                  ? `- ${
                      btn.emoji.match(/^\d+$/)
                        ? `<:${btn.emoji}:${btn.emoji}>`
                        : btn.emoji
                    } (${btn.style || 'primary'})`
                  : '- Bouton invalide (emoji manquant)',
              )
              .join('\n')
          : 'Aucun bouton configuré.';

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Configuration des Tickets')
              .setDescription(
                `**Salon** : ${
                  config.ticketChannelId
                    ? `<#${config.ticketChannelId}>`
                    : 'Non défini'
                }\n` +
                  `**Catégorie** : ${
                    config.ticketCategoryId
                      ? `<#${config.ticketCategoryId}>`
                      : 'Non défini'
                  }\n` +
                  `**Titre de l'embed** : ${
                    config.embedTitle || 'Ouvrir un Ticket'
                  }\n` +
                  `**Description de l'embed** : ${
                    config.embedDescription ||
                    'Cliquez sur un bouton pour créer un ticket.'
                  }\n` +
                  `**Couleur de l'embed** : ${config.embedColor || '#131416'}\n` +
                  (config.embedImage
                    ? `**Image de l'embed** : ${config.embedImage}\n`
                    : '') +
                  `**Boutons** :\n${buttons}`,
              )
              .setColor(Colors.Blurple),
          ],
          ephemeral: true,
        });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }

      // Sous-commande : remove
      else if (subcommand === 'remove') {
        const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
        if (!config || !config.ticketButtons.length) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Aucun bouton configuré à supprimer.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('remove_ticket_button')
          .setPlaceholder('Sélectionnez un bouton à supprimer')
          .setOptions(
            config.ticketButtons.map((btn, index) => ({
              label: btn.embedDescription
                ? btn.embedDescription.slice(0, 100)
                : `Bouton ${index + 1}`,
              value: index.toString(),
              emoji: btn.emoji && btn.emoji.match(/^\d+$/) ? { id: btn.emoji } : btn.emoji || '❓',
            })),
          );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu,
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Supprimer un Bouton')
              .setDescription(
                'Sélectionnez un bouton à supprimer dans le menu ci-dessous.',
              )
              .setColor(Colors.Blurple),
          ],
          components: [row],
          ephemeral: true,
        });
      }
    }

    // Groupe : button
    else if (subcommandGroup === 'button') {
      // Sous-commande : add
      if (subcommand === 'add') {
        const emojiInput = interaction.options.getString('emoji', true); // Required
        const description = interaction.options.getString('description', true); // Required
        const rawStyle = interaction.options.getString('style');
        const title = interaction.options.getString('title');

        const emoji = await resolveEmoji(emojiInput, interaction.guild);
        if (!emoji) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  '`❌` Emoji invalide. Utilisez un emoji Unicode (📩), un nom (:nom:), ou un ID. Assurez-vous que l’emoji existe dans ce serveur.',
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const validStyles = ['primary', 'secondary', 'success'] as const;
        const style:
          | 'primary'
          | 'secondary'
          | 'success'
          | undefined = rawStyle && validStyles.includes(rawStyle as any)
          ? (rawStyle as 'primary' | 'secondary' | 'success')
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

        const maxButtons = 5;
        if (config.ticketButtons.length >= maxButtons) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `\`❌\` Limite de boutons atteinte (${maxButtons}).`,
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
          return;
        }

        const customId = `ticket_create_${config.ticketButtons.length}_${Date.now()}`;
        config.ticketButtons.push({
          customId,
          emoji,
          style,
          embedTitle: title ?? undefined,
          embedDescription: description,
        });

        await config.save();

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `\`✅\` Bouton ajouté avec l'emoji : ${
                  emoji.match(/^\d+$/) ? `<:${emoji}:${emoji}>` : emoji
                }`,
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
      }
    }
  },
);

// Setup select menu handler
export function setupSelectMenuHandler(client: Client) {
  clientInstance = client; // Store client instance
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.inCachedGuild()) return;

    const selectInteraction = interaction as StringSelectMenuInteraction;

    if (selectInteraction.customId === 'remove_ticket_button') {
      const index = parseInt(selectInteraction.values[0]);
      const config = await TicketConfig.findOne({ guildId: interaction.guild.id });
      if (!config || index >= config.ticketButtons.length) {
        await selectInteraction.update({
          embeds: [
            new EmbedBuilder()
              .setDescription('`❌` Bouton non trouvé.')
              .setColor(Colors.Red),
          ],
          components: [],
        });
        return;
      }

      const removedButton = config.ticketButtons.splice(index, 1)[0];
      await config.save();

      await selectInteraction.update({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `\`✅\` Bouton supprimé : ${
                removedButton.emoji.match(/^\d+$/)
                  ? `<:${removedButton.emoji}:${removedButton.emoji}>`
                  : removedButton.emoji
              }`,
            )
            .setColor(Colors.Green),
        ],
        components: [],
      });
    }
  });
}
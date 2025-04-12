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
            options: [
              {
                name: 'button_index',
                description: 'Index du bouton à supprimer (1 à 5, voir la liste ci-dessous)',
                type: ApplicationCommandOptionType.Integer,
                required: true,
                min_value: 1,
                max_value: 5,
              },
            ],
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

        try {
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
        } catch (error) {
          console.error('[ERROR] Failed to save TicketConfig in setup:', error);
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Erreur lors de la sauvegarde de la configuration.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
        }
      }

      // Sous-commande : send
      else if (subcommand === 'send') {
        try {
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
            if (!btn.emoji) {
              console.warn(`[WARN] Skipping button ${btn.customId}: missing emoji`);
              continue;
            }
            const emojiId = await resolveEmoji(btn.emoji, interaction.guild);
            if (!emojiId) {
              console.warn(`[WARN] Skipping button ${btn.customId}: invalid emoji ${btn.emoji}`);
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
        } catch (error) {
          console.error('[ERROR] Failed to process send command:', error);
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Erreur lors de l\'envoi de l\'embed des tickets.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
        }
      }

      // Sous-commande : status
      else if (subcommand === 'status') {
        try {
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
                .map((btn, index) =>
                  btn.emoji
                    ? `${index + 1}. ${
                        btn.emoji.match(/^\d+$/)
                          ? `<:${btn.emoji}:${btn.emoji}>`
                          : btn.emoji
                      } (${btn.style || 'primary'})`
                    : `${index + 1}. Bouton invalide (emoji manquant)`,
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
        } catch (error) {
          console.error('[ERROR] Failed to process status command:', error);
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Erreur lors de la récupération de la configuration.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
        }
      }

      // Sous-commande : remove
      else if (subcommand === 'remove') {
        try {
          const buttonIndex = interaction.options.getInteger('button_index', true);
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

          const buttonsList = config.ticketButtons.length
            ? config.ticketButtons
                .map((btn, index) =>
                  btn.emoji
                    ? `${index + 1}. ${
                        btn.emoji.match(/^\d+$/)
                          ? `<:${btn.emoji}:${btn.emoji}>`
                          : btn.emoji
                      } (${btn.style || 'primary'})`
                    : `${index + 1}. Bouton invalide (emoji manquant)`,
                )
                .join('\n')
            : 'Aucun bouton configuré.';

          // Convert 1-based index to 0-based
          const index = buttonIndex - 1;
          if (index < 0 || index >= config.ticketButtons.length) {
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle('Erreur de Suppression')
                  .setDescription(
                    `\`❌\` Index invalide. Choisissez un numéro entre 1 et ${config.ticketButtons.length}.\n\n**Boutons disponibles** :\n${buttonsList}`,
                  )
                  .setColor(Colors.Red),
              ],
              ephemeral: true,
            });
            return;
          }

          const removedButton = config.ticketButtons.splice(index, 1)[0];
          await config.save();

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('Bouton Supprimé')
                .setDescription(
                  `\`✅\` Bouton supprimé : ${
                    removedButton.emoji
                      ? removedButton.emoji.match(/^\d+$/)
                        ? `<:${removedButton.emoji}:${removedButton.emoji}>`
                        : removedButton.emoji
                      : '(emoji manquant)'
                  }\n\n**Boutons restants** :\n${
                    config.ticketButtons.length
                      ? config.ticketButtons
                          .map((btn, i) =>
                            btn.emoji
                              ? `${i + 1}. ${
                                  btn.emoji.match(/^\d+$/)
                                    ? `<:${btn.emoji}:${btn.emoji}>`
                                    : btn.emoji
                                } (${btn.style || 'primary'})`
                              : `${i + 1}. Bouton invalide (emoji manquant)`,
                          )
                          .join('\n')
                      : 'Aucun bouton configuré.'
                  }`,
                )
                .setColor(Colors.Green),
            ],
            ephemeral: true,
          });
          setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
        } catch (error) {
          console.error('[ERROR] Failed to process remove command:', error);
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Erreur lors de la suppression du bouton.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
        }
      }
    }

    // Groupe : button
    else if (subcommandGroup === 'button') {
      // Sous-commande : add
      if (subcommand === 'add') {
        try {
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
        } catch (error) {
          console.error('[ERROR] Failed to process button add command:', error);
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription('`❌` Erreur lors de l\'ajout du bouton.')
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
        }
      }
    }
  },
);
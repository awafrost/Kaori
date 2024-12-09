import { Button, Modal } from '@akki256/discord-interaction';
import { document } from '@const/links';
import { isURL } from '@modules/util';
import {
  ActionRowBuilder,
  type ColorResolvable,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  resolveColor,
} from 'discord.js';
import { reloadEmbedMaker } from './_function';

const button = new Button(
  { customId: 'kaori:embedMaker-base' },
  (interaction) => {
    const embed = interaction.message.embeds[0];

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:embedMaker-baseModal')
        .setTitle('Title, Description, and Color')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('title')
              .setLabel('Title')
              .setValue(embed.title || '')
              .setMaxLength(256)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('url')
              .setLabel('Title URL')
              .setValue(embed.url || '')
              .setPlaceholder(`Example: ${document}`)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Description')
              .setValue(embed.description || '')
              .setMaxLength(3999)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('color')
              .setLabel('Color Code (or Color Name)')
              .setValue(embed.hexColor || '')
              .setPlaceholder('Example: #ffffff, Red')
              .setStyle(TextInputStyle.Short),
          ),
        ),
    );
  },
);

const modal = new Modal(
  { customId: 'kaori:embedMaker-baseModal' },
  (interaction) => {
    if (!interaction.isFromMessage()) return;

    const title = interaction.fields.getTextInputValue('title') || null;
    const url = interaction.fields.getTextInputValue('url') || null;
    const description =
      interaction.fields.getTextInputValue('description') || null;
    let color: string | number = interaction.fields.getTextInputValue('color');

    if (url && !isURL(url))
      return interaction.reply({
        content:
          '`❌` Please enter a URL starting with `http://` or `https://`.',
        ephemeral: true,
      });

    try {
      color = resolveColor(color as ColorResolvable);
    } catch {
      return interaction.reply({
        content:
          '`❌` Invalid color code or color name entered. Please refer to [this page](https://docs.nonick-js.com/nonick.js/features/embed/) for the correct values.',
        ephemeral: true,
      });
    }

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle(title)
      .setURL(url)
      .setDescription(description)
      .setColor(color);

    reloadEmbedMaker(interaction, embed.toJSON());
  },
);

module.exports = [button, modal];
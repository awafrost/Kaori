import { Button, Modal } from '@akki256/discord-interaction';
import { isURL } from '@modules/util';
import {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { reloadEmbedMaker } from './_function';

const button = new Button(
  { customId: 'kaori:embedMaker-image' },
  (interaction) => {
    const embed = interaction.message.embeds[0];

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:embedMaker-imageModal')
        .setTitle('Image')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('thumbnailUrl')
              .setLabel('Thumbnail (URL)')
              .setMaxLength(1000)
              .setPlaceholder('The specified image will be displayed in the top-right corner')
              .setValue(embed.thumbnail?.url || '')
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('imageUrl')
              .setLabel('Image inside embed (URL)')
              .setMaxLength(1000)
              .setPlaceholder('The specified image will be displayed at the bottom')
              .setValue(embed.image?.url || '')
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
        ),
    );
  },
);

const modal = new Modal(
  { customId: 'kaori:embedMaker-imageModal' },
  (interaction) => {
    if (!interaction.isFromMessage()) return;

    const thumbnailUrl = interaction.fields.getTextInputValue('thumbnailUrl');
    const imageUrl = interaction.fields.getTextInputValue('imageUrl');

    if (
      (thumbnailUrl && !isURL(thumbnailUrl)) ||
      (imageUrl && !isURL(imageUrl))
    )
      return interaction.reply({
        content:
          '`❌` Please enter a URL starting with `http://` or `https://`.',
        ephemeral: true,
      });

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setThumbnail(thumbnailUrl || null)
      .setImage(imageUrl || null);

    reloadEmbedMaker(interaction, embed.toJSON());
  },
);

module.exports = [button, modal];
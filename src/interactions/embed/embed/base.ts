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
        .setTitle('Titre, Description et Couleur')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('title')
              .setLabel('Titre')
              .setValue(embed.title || '')
              .setMaxLength(256)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('url')
              .setLabel('URL du titre')
              .setValue(embed.url || '')
              .setPlaceholder(`Exemple : ${document}`)
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
              .setLabel('Code couleur (ou nom de la couleur)')
              .setValue(embed.hexColor || '')
              .setPlaceholder('Exemple : #ffffff, Rouge')
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
          '`❌` Veuillez entrer une URL commençant par `http://` ou `https://`.',
        ephemeral: true,
      });

    try {
      color = resolveColor(color as ColorResolvable);
    } catch {
      return interaction.reply({
        content:
          '`❌` Code couleur ou nom de couleur invalide. Veuillez consulter [cette page](https://docs.nonick-js.com/nonick.js/features/embed/) pour les valeurs correctes.',
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
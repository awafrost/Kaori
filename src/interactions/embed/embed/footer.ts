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
  { customId: 'kaori:embedMaker-footer' },
  (interaction): void => {
    const embed = interaction.message.embeds[0];

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:embedMaker-footerModal')
        .setTitle('Footer')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('text')
              .setLabel('Text')
              .setMaxLength(2048)
              .setValue(embed.footer?.text || '')
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('iconURL')
              .setLabel('Icon URL')
              .setMaxLength(1000)
              .setValue(embed.footer?.iconURL || '')
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
        ),
    );
  },
);

const modal = new Modal(
  { customId: 'kaori:embedMaker-footerModal' },
  (interaction) => {
    if (!interaction.isFromMessage()) return;

    const text = interaction.fields.getTextInputValue('text');
    const iconURL =
      interaction.fields.getTextInputValue('iconURL') || undefined;
    const option = text ? { text, iconURL } : null;

    if (!text && iconURL)
      return interaction.reply({
        content:
          '`❌` If you set an icon URL, you must also enter text.',
        ephemeral: true,
      });
    if (iconURL && !isURL(iconURL))
      return interaction.reply({
        content:
          '`❌` Please enter a URL starting with `http://` or `https://`.',
        ephemeral: true,
      });

    const embed = EmbedBuilder.from(interaction.message.embeds[0]).setFooter(
      option,
    );

    reloadEmbedMaker(interaction, embed.toJSON());
  },
);

module.exports = [button, modal];
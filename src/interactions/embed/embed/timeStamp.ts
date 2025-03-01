import { Button, Modal } from '@akki256/discord-interaction';
import {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { reloadEmbedMaker } from './_function';

const button = new Button(
  { customId: 'kaori:embedMaker-timeStamp' },
  (interaction) => {
    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:embedMaker-timeStampModal')
        .setTitle('Horodatage')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('timeStamp')
              .setLabel('AAAA-MM-JJThh:mm:ss+fuseau (Utilisez "now" pour l’heure actuelle)')
              .setPlaceholder('ex. : 2023-10-17T10:17:00+09:00')
              .setValue(interaction.message.embeds[0].timestamp || '')
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
        ),
    );
  },
);

const modal = new Modal(
  { customId: 'kaori:embedMaker-timeStampModal' },
  (interaction) => {
    if (!interaction.isFromMessage()) return;

    let timeStamp = interaction.fields.getTextInputValue('timeStamp');
    if (timeStamp.toLowerCase() === 'now') timeStamp = new Date().toISOString();

    if (
      timeStamp !== '' &&
      !/^\d{4}-?\d\d-?\d\d(?:T\d\d(?::?\d\d(?::?\d\d(?:\.\d+)?)?)?(?:Z|[+-]\d\d:?\d\d)?)?$/.test(
        timeStamp,
      )
    )
      return interaction.reply({
        content:
          '`❌` Horodatage invalide ! Veuillez entrer une valeur valide conforme à [ISO8601](https://fr.wikipedia.org/wiki/ISO_8601).',
        ephemeral: true,
      });

    const embed = EmbedBuilder.from(interaction.message.embeds[0]).setTimestamp(
      timeStamp ? new Date(timeStamp).getTime() : null,
    );

    reloadEmbedMaker(interaction, embed.toJSON());
  },
);

module.exports = [button, modal];
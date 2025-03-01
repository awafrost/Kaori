import { Button, Modal } from '@akki256/discord-interaction';
import { white } from '@const/emojis';
import {
  type APIButtonComponent,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getBaseEmbedMakerButtons, reloadEmbedMaker } from './_function';

const addField = [
  new Button(
    { customId: 'kaori:embedMaker-addField' },
    async (interaction) => {
      if (interaction.message.embeds[0].fields.length === 25) return;

      interaction.showModal(
        new ModalBuilder()
          .setCustomId('kaori:embedMaker-addFieldModal')
          .setTitle('Ajouter un champ')
          .setComponents(
            new ActionRowBuilder<TextInputBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId('name')
                .setLabel('Nom du champ')
                .setMaxLength(256)
                .setStyle(TextInputStyle.Short),
            ),
            new ActionRowBuilder<TextInputBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId('value')
                .setLabel('Valeur du champ')
                .setMaxLength(1024)
                .setStyle(TextInputStyle.Paragraph),
            ),
            new ActionRowBuilder<TextInputBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId('inline')
                .setLabel('Affichage en ligne')
                .setMaxLength(5)
                .setPlaceholder('Mettre "true" pour OUI, "false" pour NON')
                .setStyle(TextInputStyle.Short),
            ),
          ),
      );
    },
  ),

  new Modal(
    { customId: 'kaori:embedMaker-addFieldModal' },
    (interaction) => {
      if (!interaction.isFromMessage()) return;

      const name = interaction.fields.getTextInputValue('name');
      const value = interaction.fields.getTextInputValue('value');
      const inline = interaction.fields.getTextInputValue('inline');

      if (!['true', 'false'].includes(inline))
        return interaction.reply({
          content: '`❌` La valeur de `inline` doit être `true` ou `false`.',
          ephemeral: true,
        });

      const embed = EmbedBuilder.from(interaction.message.embeds[0]).addFields({
        name,
        value,
        inline: JSON.parse(inline.toLowerCase()),
      });

      reloadEmbedMaker(interaction, embed.toJSON());
    },
  ),
];

const removeField = [
  new Button(
    { customId: 'kaori:embedMaker-removeField' },
    async (interaction) => {
      const embed = interaction.message.embeds[0];
      const components = interaction.message.components;

      if (embed.fields.length === 0) return;
      if (embed.fields.length === 1)
        return reloadEmbedMaker(
          interaction,
          EmbedBuilder.from(embed).setFields().data,
        );

      const indexSelectCustomId = 'kaori:embedMaker-removeFieldSelect';
      const backButtonCustomId =
        'kaori:embedMaker-selectRole-removeRoleSelect-back';

      const message = await interaction.update({
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            new StringSelectMenuBuilder()
              .setCustomId(indexSelectCustomId)
              .setPlaceholder('Sélectionnez le champ à supprimer')
              .setOptions(
                ...embed.fields.map((v, index) => ({
                  label: omitString(v.name, 100),
                  description: omitString(v.value, 100),
                  value: String(index),
                  emoji: white.message,
                })),
              ),
          ),
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId(backButtonCustomId)
              .setLabel('Revenir sans supprimer')
              .setEmoji(white.reply)
              .setStyle(ButtonStyle.Danger),
          ),
        ],
        fetchReply: true,
      });

      message
        .awaitMessageComponent({
          filter: (v) =>
            [indexSelectCustomId, backButtonCustomId].includes(v.customId),
          time: 180_000,
        })
        .then((i) => {
          if (i.customId === indexSelectCustomId && i.isStringSelectMenu()) {
            const newEmbed = EmbedBuilder.from(embed).setFields(
              embed.fields.filter((v, index) => Number(i.values[0]) !== index),
            );

            const newComponents = getBaseEmbedMakerButtons(newEmbed.toJSON());
            newComponents[1].addComponents(
              ButtonBuilder.from(
                components[1].components[3] as APIButtonComponent,
              ),
            );

            i.update({ embeds: [newEmbed], components: newComponents });
          } else if (i.customId === backButtonCustomId && i.isButton()) {
            const newComponents = getBaseEmbedMakerButtons(embed);
            newComponents[1].addComponents(
              ButtonBuilder.from(
                components[1].components[3] as APIButtonComponent,
              ),
            );

            i.update({ embeds: [embed], components: newComponents });
          }
        })
        .catch(() => {});
    },
  ),
];

function omitString(text: string, limit: number): string {
  return text.length > limit ? `${text.substring(0, limit - 4)} ...` : text;
}

module.exports = [...addField, ...removeField];
import { Button, Modal } from '@akki256/discord-interaction';
import {
  ActionRowBuilder,
  ComponentType,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getRoleSelectMakerButtons } from './_function';

const selectEditButton = new Button(
  { customId: 'kaori:emberMaker-selectRole-placeholder' },
  (interaction) => {
    const select = interaction.message.components[0].components[0];
    if (select.type !== ComponentType.StringSelect) return;

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:emberMaker-selectRole-placeholderModal')
        .setTitle('Modifier le menu déroulant')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('placeholder')
              .setLabel('Texte indicatif du menu déroulant')
              .setPlaceholder('Texte affiché quand rien n’est sélectionné')
              .setValue(select.placeholder ?? '')
              .setMaxLength(20)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
        ),
    );
  },
);

const selectEditModal = new Modal(
  { customId: 'kaori:emberMaker-selectRole-placeholderModal' },
  (interaction) => {
    if (
      !interaction.isFromMessage() ||
      interaction.message.components[0].components[0]?.type !==
        ComponentType.StringSelect ||
      interaction.message.components[0].components[0].customId ===
        'kaori:embedMaker-selectRole-removeRoleSelect'
    )
      return;

    const select = StringSelectMenuBuilder.from(
      interaction.message.components[0].components[0],
    ).setPlaceholder(interaction.fields.getTextInputValue('placeholder'));

    interaction.update({
      content: null,
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(select),
        getRoleSelectMakerButtons(select.toJSON()),
      ],
    });
  },
);

module.exports = [selectEditButton, selectEditModal];
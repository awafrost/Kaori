import { white } from '@const/emojis';
import {
  type APIStringSelectComponent,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export function getRoleSelectMakerButtons(
  selectMenu?: Partial<APIStringSelectComponent>,
) {
  return new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder()
      .setCustomId('kaori:embedMaker-selectRole-addRole')
      .setEmoji(white.addMark)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(selectMenu?.options?.length === 25),
    new ButtonBuilder()
      .setCustomId('kaori:embedMaker-selectRole-removeRole')
      .setEmoji(white.removeMark)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!selectMenu?.options?.length),
    new ButtonBuilder()
      .setCustomId('kaori:embedMaker-selectRole-placeholder')
      .setEmoji(white.message)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!selectMenu),
    new ButtonBuilder()
      .setCustomId(
        (selectMenu?.max_values || 0) <= 1
          ? 'kaori:embedMaker-selectRole-selectMode-single'
          : 'kaori:embedMaker-selectRole-selectMode-multi',
      )
      .setLabel(
        (selectMenu?.max_values || 0) <= 1
          ? 'Selection Mode: Single'
          : 'Selection Mode: Multiple',
      )
      .setStyle(ButtonStyle.Success)
      .setDisabled(!selectMenu),
    new ButtonBuilder()
      .setCustomId('kaori:embedMaker-selectRole-sendComponent')
      .setLabel('Add')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!selectMenu),
  );
}
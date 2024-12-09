import { white } from '@const/emojis';
import {
  type APIButtonComponent,
  type APIEmbed,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Embed,
  type MessageComponentInteraction,
  ModalSubmitInteraction,
} from 'discord.js';

export enum embedMakerType {
  send = 'send',
  edit = 'edit',
}

export function getBaseEmbedMakerButtons(embed: APIEmbed | Embed) {
  return [
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId('kaori:embedMaker-base')
        .setLabel('Base')
        .setEmoji(white.message)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('kaori:embedMaker-image')
        .setLabel('Image')
        .setEmoji(white.image)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('kaori:embedMaker-author')
        .setLabel('Header')
        .setEmoji(white.member)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('kaori:embedMaker-footer')
        .setLabel('Footer')
        .setEmoji(white.member)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('kaori:embedMaker-timeStamp')
        .setEmoji(white.schedule)
        .setStyle(ButtonStyle.Secondary),
    ),

    new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId('kaori:embedMaker-addField')
        .setLabel('Field')
        .setEmoji(white.addMark)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(embed.fields?.length === 25),
      new ButtonBuilder()
        .setCustomId('kaori:embedMaker-removeField')
        .setLabel('Field')
        .setEmoji(white.removeMark)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!embed.fields?.length),
      new ButtonBuilder()
        .setCustomId('kaori:embedMaker-export')
        .setEmoji(white.download)
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

export function getEmbedMakerButtons(
  embed: APIEmbed | Embed,
  type: embedMakerType,
) {
  const actionRows = getBaseEmbedMakerButtons(embed);

  switch (type) {
    case 'send':
      actionRows[1].addComponents(
        new ButtonBuilder()
          .setCustomId('kaori:embedMaker-send')
          .setLabel('Send')
          .setStyle(ButtonStyle.Primary),
      );
      break;

    case 'edit':
      actionRows[1].addComponents(
        new ButtonBuilder()
          .setCustomId('kaori:embedMaker-edit')
          .setLabel('Edit')
          .setStyle(ButtonStyle.Primary),
      );
      break;

    default:
      break;
  }

  return actionRows;
}

export function reloadEmbedMaker(
  interaction: MessageComponentInteraction | ModalSubmitInteraction,
  embed: APIEmbed | Embed,
) {
  if (
    interaction instanceof ModalSubmitInteraction &&
    !interaction.isFromMessage()
  )
    return;

  const components = getBaseEmbedMakerButtons(embed);
  components[1].addComponents(
    ButtonBuilder.from(
      interaction.message.components[1].components[3] as APIButtonComponent,
    ),
  );

  interaction.update({ embeds: [embed], components }).catch((e) =>
    interaction.reply({
      content: `\`❌\` Failed to update the embed.\n\`${e}\``,
    }),
  );
}
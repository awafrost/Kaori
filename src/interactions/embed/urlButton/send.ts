import { Button, Modal } from '@akki256/discord-interaction';
import { isURL } from '@modules/util';
import {
  type ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonComponent,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const sendLinkButton = new Button(
  { customId: 'kaori:embedMaker-linkButton-send' },
  (interaction) => {
    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:embedMaker-linkButton-sendModal')
        .setTitle('Create Button')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('url')
              .setLabel('URL')
              .setStyle(TextInputStyle.Short),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('label')
              .setLabel('Button Text')
              .setMaxLength(80)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('emojiNameOrId')
              .setLabel('Unicode Emoji or Custom Emoji')
              .setPlaceholder('One character only; for custom emoji, enter name or ID')
              .setMaxLength(32)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
        ),
    );
  },
);

const sendLinkButtonModal = new Modal(
  { customId: 'kaori:embedMaker-linkButton-sendModal' },
  async (interaction) => {
    // Create Button
    if (
      !interaction.isFromMessage() ||
      !interaction.inCachedGuild() ||
      interaction.message.components[0].components[0].type !==
        ComponentType.Button ||
      !interaction.channel
    )
      return;

    const emojiRegex = new RegExp(
      /\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu,
    );
    const label = interaction.fields.getTextInputValue('label');
    const url = interaction.fields.getTextInputValue('url');
    const emojiNameOrId = interaction.fields.getTextInputValue('emojiNameOrId');
    const emoji =
      interaction.guild.emojis.cache.find((v) => v.name === emojiNameOrId)
        ?.id || emojiNameOrId.match(emojiRegex)?.[0];

    if (!label && !emoji)
      return interaction.reply({
        content:
          '`❌` You must provide either button text or emoji.',
        ephemeral: true,
      });
    if (!isURL(url))
      return interaction.reply({
        content:
          '`❌` Please enter a URL starting with `http://` or `https://`.',
        ephemeral: true,
      });

    const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url);

    if (emoji) button.setEmoji(emoji);
    if (label) button.setLabel(label);

    // Edit Message
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageWebhooks,
      )
    )
      return interaction.reply({
        content:
          '`❌` To use this feature, please grant the bot `Manage Webhooks` permission.',
        ephemeral: true,
      });

    const targetId =
      interaction.message.embeds[0].footer?.text.match(/[0-9]{18,19}/)?.[0];
    if (!targetId) return;
    const targetMessage = await (await interaction.channel.fetch()).messages
      .fetch(targetId)
      .catch(() => undefined);

    if (!targetMessage)
      return interaction.reply({
        content: '`❌` There was an issue retrieving the message.',
        ephemeral: true,
      });

    const webhook = await targetMessage.fetchWebhook().catch(() => null);
    if (!webhook || interaction.client.user.id !== webhook.owner?.id)
      return interaction.reply({
        content: '`❌` This message cannot be updated.',
        ephemeral: true,
      });
    if (targetMessage.components[4]?.components?.length === 5)
      return interaction.reply({
        content: '`❌` No more components can be added!',
        ephemeral: true,
      });
    if (
      targetMessage.components[0]?.components[0]?.type ===
      ComponentType.StringSelect
    )
      return interaction.reply({
        content:
          '`❌` Select menus and buttons cannot be added to the same message.',
        ephemeral: true,
      });

    const updatedComponents = targetMessage.components.map((v) =>
      ActionRowBuilder.from<ButtonBuilder>(v as ActionRow<ButtonComponent>),
    );
    const lastActionRow = updatedComponents.slice(-1)[0];

    if (!lastActionRow || lastActionRow.components.length === 5)
      updatedComponents.push(
        new ActionRowBuilder<ButtonBuilder>().setComponents(button),
      );
    else
      updatedComponents.splice(
        updatedComponents.length - 1,
        1,
        ActionRowBuilder.from<ButtonBuilder>(lastActionRow).addComponents(
          button,
        ),
      );

    const embeds = interaction.message.embeds;
    const components = interaction.message.components;
    await interaction.update({
      content: '`⌛` Adding components...',
      embeds: [],
      components: [],
    });

    await webhook.edit({ channel: interaction.channelId });
    webhook
      .editMessage(targetMessage, { components: updatedComponents })
      .then(() =>
        interaction.editReply({
          content: '`✅` Components added!',
          embeds,
          components,
        }),
      )
      .catch(() =>
        interaction.editReply({
          content: '`❌` There was an issue updating the components.',
          embeds,
          components,
        }),
      );
  },
);

module.exports = [sendLinkButton, sendLinkButtonModal];
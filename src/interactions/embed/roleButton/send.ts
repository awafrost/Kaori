import { Button, Modal } from '@akki256/discord-interaction';
import { getDangerPermission } from '@modules/embed';
import { permToText } from '@modules/util';
import {
  type ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonComponent,
  ButtonStyle,
  Colors,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  Role,
  TextInputBuilder,
  TextInputStyle,
  inlineCode,
} from 'discord.js';

const sendRoleButton = new Button(
  { customId: 'kaori:embedMaker-roleButton-send' },
  (interaction) => {
    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:embedMaker-roleButton-sendModal')
        .setTitle('Create Button')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('roleNameOrId')
              .setLabel('Role Name or ID')
              .setMaxLength(100)
              .setStyle(TextInputStyle.Short),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('displayName')
              .setLabel('Display Name on Button')
              .setPlaceholder('e.g., Minecraft players')
              .setMaxLength(80)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('emojiNameOrId')
              .setLabel('Unicode Emoji or Custom Emoji')
              .setPlaceholder('One character only; custom emoji requires name or ID')
              .setMaxLength(32)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
        ),
    );
  },
);

const sendRoleButtonModal = new Modal(
  { customId: 'kaori:embedMaker-roleButton-sendModal' },
  async (interaction) => {
    // Create Button
    if (
      !interaction.isFromMessage() ||
      !interaction.inCachedGuild() ||
      interaction.message.components[0].components[1].type !==
        ComponentType.Button ||
      !interaction.channel
    )
      return;

    const emojiRegex = new RegExp(
      /\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu,
    );
    const roleNameOrId = interaction.fields.getTextInputValue('roleNameOrId');
    const emojiNameOrId = interaction.fields.getTextInputValue('emojiNameOrId');
    const displayName = interaction.fields.getTextInputValue('displayName');

    const role = interaction.guild?.roles.cache.find(
      (v) => v.name === roleNameOrId || v.id === roleNameOrId,
    );
    const emoji =
      interaction.guild.emojis.cache.find(
        (v) => v.name === emojiNameOrId || v.id === emojiNameOrId,
      )?.id || emojiNameOrId.match(emojiRegex)?.[0];

    if (!(role instanceof Role))
      return interaction.reply({
        content: '`❌` Could not find a role matching the entered value.',
        ephemeral: true,
      });
    if (role?.managed)
      return interaction.reply({
        content:
          '`❌` This role is managed by an external service and cannot be added to the select menu.',
        ephemeral: true,
      });
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.member.roles.highest.position < role.position
    )
      return interaction.reply({
        content:
          '`❌` You cannot add a role higher than your own roles.',
      });

    const button = new ButtonBuilder()
      .setCustomId(`kaori:roleButton-${role.id}`)
      .setStyle(interaction.message.components[0].components[1].style);

    if (emoji) {
      if (displayName) button.setLabel(displayName);
      button.setEmoji(emoji);
    } else button.setLabel(displayName || role.name);

    // Edit Message
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageWebhooks,
      )
    )
      return interaction.reply({
        content:
          '`❌` You need to grant the "Manage Webhooks" permission to the bot to use this feature.',
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
        content: '`❌` There was an issue fetching the message.',
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
    if (
      targetMessage.components.some((v) =>
        v.components
          .map((i) => i.customId)
          .includes(`kaori:roleButton-${role.id}`),
      )
    )
      return interaction.reply({
        content: '`❌` This role button has already been added.',
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

    // Check Permission
    const dangerPermissions = getDangerPermission(role);

    if (dangerPermissions.length) {
      const message = await interaction.update({
        content: null,
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('`⚠️` Warning!')
            .setDescription(
              [
                `${role} has potentially dangerous permissions.` +
                '**Do you really want to add this role?**',
                '',
                `> ${permToText(...dangerPermissions)
                  .map((v) => inlineCode(v))
                  .join(' ')}`,
              ].join('\n'),
            )
            .setColor(Colors.Yellow),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-roleButton-send-agree')
              .setLabel('Yes')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-roleButton-send-disagree')
              .setLabel('No')
              .setStyle(ButtonStyle.Danger),
          ),
        ],
      });

      message
        .awaitMessageComponent({
          filter: (v) =>
            /^kaori:embedMaker-roleButton-send-(agree|disagree)$/.test(v.customId),
          componentType: ComponentType.Button,
          time: 180_000,
        })
        .then(async (i) => {
          if (i.customId === 'kaori:embedMaker-roleButton-send-disagree')
            return i.update({ embeds, components });

          await i.update({
            content: '`⌛` Adding component...',
            embeds: [],
            components: [],
          });
          await webhook.edit({ channel: i.channelId });
          webhook
            .editMessage(targetMessage, { components: updatedComponents })
            .then(() =>
              i.editReply({
                content: '`✅` Component added!',
                embeds,
                components,
              }),
            )
            .catch(() =>
              i.editReply({
                content: '`❌` There was an issue updating the component.',
                embeds,
                components,
              }),
            );
        })
        .catch(() => {});
    } else {
      await interaction.update({
        content: '`⌛` Adding component...',
        embeds: [],
        components: [],
      });
      await webhook.edit({ channel: interaction.channelId });
      webhook
        .editMessage(targetMessage, { components: updatedComponents })
        .then(() =>
          interaction.editReply({
            content: '`✅` Component added!',
            embeds,
            components,
          }),
        )
        .catch(() =>
          interaction.editReply({
            content: '`❌` There was an issue updating the component.',
            embeds,
            components,
          }),
        );
    }
  },
);

module.exports = [sendRoleButton, sendRoleButtonModal];
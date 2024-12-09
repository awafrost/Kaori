import {
  MessageContext,
  SelectMenu,
  SelectMenuType,
} from '@akki256/discord-interaction';
import { white } from '@const/emojis';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type User,
} from 'discord.js';
import { embedMakerType, getEmbedMakerButtons } from './embed/_function';
import { getRoleSelectMakerButtons } from './roleSelect/_function';

const context = new MessageContext(
  {
    name: 'Edit Embed',
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.appPermissions?.has(PermissionFlagsBits.ManageWebhooks))
      return interaction.reply({
        content:
          '`❌` To use this feature, the bot needs to have the `Manage Webhooks` permission.',
        ephemeral: true,
      });

    const webhook = await interaction.targetMessage
      .fetchWebhook()
      .catch(() => null);
    if (!webhook || !interaction.client.user.equals(webhook.owner as User))
      return interaction.reply({
        content:
          '`❌` Only embeds posted using Kaori and with an active webhook can be edited.',
        ephemeral: true,
      });

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('`🧰` Edit and Expand Embeds')
          .setDescription(
            'You can edit the embed or add URL buttons, role assignment buttons, and select menus.',
          )
          .setColor(Colors.Blurple)
          .setFooter({ text: `Message ID: ${interaction.targetId}` }),
      ],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
          new StringSelectMenuBuilder()
            .setCustomId('kaori:embedMaker-editEmbedPanel')
            .setOptions(
              {
                label: 'Edit Embed',
                value: 'editEmbed',
                emoji: white.pencil,
              },
              {
                label: 'Add Role Assign (Select Menu)',
                value: 'addRoleSelect',
                emoji: white.role2,
              },
              {
                label: 'Add Role Assign (Button)',
                value: 'addRoleButton',
                emoji: white.role2,
              },
              {
                label: 'Add URL Button',
                value: 'addUrlButton',
                emoji: white.link,
              },
              { label: 'Delete Component', value: 'delete', emoji: '🗑' },
            ),
        ),
      ],
      ephemeral: true,
    });
  },
);

const select = new SelectMenu(
  {
    customId: 'kaori:embedMaker-editEmbedPanel',
    type: SelectMenuType.String,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;
    const targetId =
      interaction.message.embeds[0].footer?.text.match(/[0-9]{18,19}/)?.[0];
    const targetMessage = await interaction.channel?.messages
      .fetch(targetId || '')
      ?.catch(() => undefined);

    if (!targetMessage)
      return interaction.update({
        content: '`❌` There was an issue while fetching the message.',
        embeds: [],
        components: [],
      });

    if (interaction.values[0] === 'editEmbed')
      interaction.update({
        content: `Message ID: ${targetId}`,
        embeds: targetMessage.embeds,
        components: getEmbedMakerButtons(
          targetMessage.embeds[0],
          embedMakerType.edit,
        ),
      });
    else if (interaction.values[0] === 'addRoleSelect') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({
          content: '`❌` You do not have permission to use this feature.',
          ephemeral: true,
        });

      interaction.update({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('`🧰` Add Role Assign (Select Menu)')
            .setDescription(
              'Use the buttons below to create a select menu and add it to the message with the "Add" button. (Up to 5 items)',
            ),
        ],
        components: [getRoleSelectMakerButtons()],
      });
    } else if (interaction.values[0] === 'addRoleButton') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({
          content: '`❌` You do not have permission to use this feature.',
          ephemeral: true,
        });

      interaction.update({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('`🧰` Add Role Assign (Button)')
            .setDescription(
              'Use the "Create Button" button to add a button to the message. (Up to 25 items)',
            ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-roleButton-send')
              .setLabel('Create Button')
              .setEmoji(white.addMark)
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-roleButton-changeStyle')
              .setLabel('Color')
              .setEmoji('🎨')
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      });
    } else if (interaction.values[0] === 'addUrlButton')
      interaction.update({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('Add URL Button')
            .setDescription(
              'Use the "Create Button" button to add a button to the message. (Up to 25 items)',
            ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-linkButton-send')
              .setLabel('Create Button')
              .setEmoji(white.addMark)
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
      });
    else if (interaction.values[0] === 'delete') {
      if (targetMessage.components.length === 0)
        return interaction.reply({
          content: '`❌` No components have been added.',
          ephemeral: true,
        });

      interaction.update({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('`🧰` Delete Component')
            .setDescription(
              'Use the select menu below to choose which component to delete.',
            ),
        ],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            new StringSelectMenuBuilder()
              .setCustomId('kaori:manageComponents-delete')
              .setOptions(
                targetMessage.components.map((v, index) => ({
                  label: `${index + 1} Line`,
                  value: String(index),
                })),
              )
              .setMaxValues(targetMessage.components.length),
          ),
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:manageComponents-deleteAll')
              .setLabel('Delete All Components')
              .setEmoji('🗑')
              .setStyle(ButtonStyle.Danger),
          ),
        ],
      });
    }
  },
);

module.exports = [context, select];
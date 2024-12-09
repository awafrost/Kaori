import { Button } from '@akki256/discord-interaction';
import {
  ActionRowBuilder,
  ComponentType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} from 'discord.js';
import { getRoleSelectMakerButtons } from './_function';

const addRoleSelectButton = new Button(
  { customId: 'kaori:embedMaker-selectRole-sendComponent' },
  async (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    if (
      interaction.message.components[0].components[0].type !==
      ComponentType.StringSelect
    )
      return interaction.reply({
        content: '`❌` No select menu has been created!',
        ephemeral: true,
      });
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageWebhooks,
      )
    )
      return interaction.reply({
        content:
          '`❌` To use this feature, the bot must have the `Manage Webhooks` permission.',
        ephemeral: true,
      });

    const roleSelect = interaction.message.components[0].components[0];
    const selectStatusButton = interaction.message.components[1].components[3];
    const targetId =
      interaction.message.embeds[0].footer?.text.match(/[0-9]{18,19}/)?.[0];
    const targetMessage = await (await interaction.channel.fetch()).messages
      .fetch(targetId || '')
      .catch(() => undefined);

    if (!targetMessage)
      return interaction.reply({
        content: '`❌` There was an issue fetching the message.',
        ephemeral: true,
      });

    const webhook = await targetMessage.fetchWebhook().catch(() => null);
    console.log(webhook);

    if (!webhook || interaction.client.user.id !== webhook.owner?.id)
      return interaction.reply({
        content: '`❌` This message cannot be updated.',
        ephemeral: true,
      });
    if (targetMessage.components.length === 5)
      return interaction.reply({
        content: '`❌` No more components can be added!',
        ephemeral: true,
      });
    if (
      targetMessage.components[0]?.components[0]?.type === ComponentType.Button
    )
      return interaction.reply({
        content:
          '`❌` Select menus and buttons cannot be added to the same message.',
        ephemeral: true,
      });

    const embeds = interaction.message.embeds;
    const components = interaction.message.components;
    await interaction.update({
      content: '`⌛` Adding components...',
      embeds: [],
      components: [],
    });

    webhook
      .editMessage(targetMessage, {
        components: [
          ...targetMessage.components,
          new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            StringSelectMenuBuilder.from(roleSelect.toJSON())
              .setCustomId(
                `${roleSelect.customId}-${targetMessage.components.length + 1}`,
              )
              .setMaxValues(
                selectStatusButton.customId ===
                  'kaori:embedMaker-selectRole-selectMode-multi'
                  ? roleSelect.options.length
                  : 1,
              ),
          ),
        ],
      })
      .then(() =>
        interaction.editReply({
          content: '`✅` Components added successfully!',
          embeds,
          components: [getRoleSelectMakerButtons()],
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

module.exports = [addRoleSelectButton];
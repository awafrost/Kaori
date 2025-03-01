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
        content: '`❌` Aucun menu déroulant n’a été créé !',
        ephemeral: true,
      });
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageWebhooks,
      )
    )
      return interaction.reply({
        content:
          '`❌` Pour utiliser cette fonctionnalité, le bot doit avoir la permission `Gérer les webhooks`.',
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
        content: '`❌` Un problème est survenu lors de la récupération du message.',
        ephemeral: true,
      });

    const webhook = await targetMessage.fetchWebhook().catch(() => null);
    console.log(webhook);

    if (!webhook || interaction.client.user.id !== webhook.owner?.id)
      return interaction.reply({
        content: '`❌` Ce message ne peut pas être mis à jour.',
        ephemeral: true,
      });
    if (targetMessage.components.length === 5)
      return interaction.reply({
        content: '`❌` Aucun composant supplémentaire ne peut être ajouté !',
        ephemeral: true,
      });
    if (
      targetMessage.components[0]?.components[0]?.type === ComponentType.Button
    )
      return interaction.reply({
        content:
          '`❌` Les menus déroulants et les boutons ne peuvent pas être ajoutés au même message.',
        ephemeral: true,
      });

    const embeds = interaction.message.embeds;
    const components = interaction.message.components;
    await interaction.update({
      content: '`⌛` Ajout des composants en cours...',
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
          content: '`✅` Composants ajoutés avec succès !',
          embeds,
          components: [getRoleSelectMakerButtons()],
        }),
      )
      .catch(() =>
        interaction.editReply({
          content: '`❌` Un problème est survenu lors de la mise à jour des composants.',
          embeds,
          components,
        }),
      );
  },
);

module.exports = [addRoleSelectButton];
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
    name: 'Modifier l’embed',
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.appPermissions?.has(PermissionFlagsBits.ManageWebhooks))
      return interaction.reply({
        content:
          '`❌` Pour utiliser cette fonctionnalité, le bot doit avoir la permission `Gérer les webhooks`.',
        ephemeral: true,
      });

    const webhook = await interaction.targetMessage
      .fetchWebhook()
      .catch(() => null);
    if (!webhook || !interaction.client.user.equals(webhook.owner as User))
      return interaction.reply({
        content:
          '`❌` Seuls les embeds envoyés par Kaori avec un webhook actif peuvent être modifiés.',
        ephemeral: true,
      });

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('`🧰` Modifier et enrichir les embeds')
          .setDescription(
            'Vous pouvez modifier l’embed ou ajouter des boutons URL, des boutons d’attribution de rôles et des menus déroulants.',
          )
          .setColor(Colors.Blurple)
          .setFooter({ text: `ID du message : ${interaction.targetId}` }),
      ],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
          new StringSelectMenuBuilder()
            .setCustomId('kaori:embedMaker-editEmbedPanel')
            .setOptions(
              {
                label: 'Modifier l’embed',
                value: 'editEmbed',
                emoji: white.pencil,
              },
              {
                label: 'Ajouter un rôle (menu déroulant)',
                value: 'addRoleSelect',
                emoji: white.role2,
              },
              {
                label: 'Ajouter un rôle (bouton)',
                value: 'addRoleButton',
                emoji: white.role2,
              },
              {
                label: 'Ajouter un bouton URL',
                value: 'addUrlButton',
                emoji: white.link,
              },
              { label: 'Supprimer un composant', value: 'delete', emoji: '🗑' },
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
        content: '`❌` Un problème est survenu lors de la récupération du message.',
        embeds: [],
        components: [],
      });

    if (interaction.values[0] === 'editEmbed')
      interaction.update({
        content: `ID du message : ${targetId}`,
        embeds: targetMessage.embeds,
        components: getEmbedMakerButtons(
          targetMessage.embeds[0],
          embedMakerType.edit,
        ),
      });
    else if (interaction.values[0] === 'addRoleSelect') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({
          content: '`❌` Vous n’avez pas la permission d’utiliser cette fonctionnalité.',
          ephemeral: true,
        });

      interaction.update({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('`🧰` Ajouter un rôle (menu déroulant)')
            .setDescription(
              'Utilisez les boutons ci-dessous pour créer un menu déroulant et l’ajouter au message avec le bouton "Ajouter". (Jusqu’à 5 éléments)',
            ),
        ],
        components: [getRoleSelectMakerButtons()],
      });
    } else if (interaction.values[0] === 'addRoleButton') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
        return interaction.reply({
          content: '`❌` Vous n’avez pas la permission d’utiliser cette fonctionnalité.',
          ephemeral: true,
        });

      interaction.update({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('`🧰` Ajouter un rôle (bouton)')
            .setDescription(
              'Utilisez le bouton "Créer un bouton" pour ajouter un bouton au message. (Jusqu’à 25 éléments)',
            ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-roleButton-send')
              .setLabel('Créer un bouton')
              .setEmoji(white.addMark)
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-roleButton-changeStyle')
              .setLabel('Couleur')
              .setEmoji('🎨')
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      });
    } else if (interaction.values[0] === 'addUrlButton')
      interaction.update({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('Ajouter un bouton URL')
            .setDescription(
              'Utilisez le bouton "Créer un bouton" pour ajouter un bouton au message. (Jusqu’à 25 éléments)',
            ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-linkButton-send')
              .setLabel('Créer un bouton')
              .setEmoji(white.addMark)
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
      });
    else if (interaction.values[0] === 'delete') {
      if (targetMessage.components.length === 0)
        return interaction.reply({
          content: '`❌` Aucun composant n’a été ajouté.',
          ephemeral: true,
        });

      interaction.update({
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('`🧰` Supprimer un composant')
            .setDescription(
              'Utilisez le menu déroulant ci-dessous pour choisir quel composant supprimer.',
            ),
        ],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            new StringSelectMenuBuilder()
              .setCustomId('kaori:manageComponents-delete')
              .setOptions(
                targetMessage.components.map((v, index) => ({
                  label: `Ligne ${index + 1}`,
                  value: String(index),
                })),
              )
              .setMaxValues(targetMessage.components.length),
          ),
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:manageComponents-deleteAll')
              .setLabel('Supprimer tous les composants')
              .setEmoji('🗑')
              .setStyle(ButtonStyle.Danger),
          ),
        ],
      });
    }
  },
);

module.exports = [context, select];
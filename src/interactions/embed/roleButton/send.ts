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
        .setTitle('Créer un bouton')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('roleNameOrId')
              .setLabel('Nom ou ID du rôle')
              .setMaxLength(100)
              .setStyle(TextInputStyle.Short),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('displayName')
              .setLabel('Nom affiché sur le bouton')
              .setPlaceholder('ex. : Joueurs Minecraft')
              .setMaxLength(80)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('emojiNameOrId')
              .setLabel('Emoji Unicode ou personnalisé')
              .setPlaceholder('Un seul caractère ; emoji perso nécessite nom ou ID')
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
    // Créer le bouton
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
        content: '`❌` Aucun rôle correspondant à la valeur saisie n’a été trouvé.',
        ephemeral: true,
      });
    if (role?.managed)
      return interaction.reply({
        content:
          '`❌` Ce rôle est géré par un service externe et ne peut pas être ajouté au menu de sélection.',
        ephemeral: true,
      });
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.member.roles.highest.position < role.position
    )
      return interaction.reply({
        content:
          '`❌` Vous ne pouvez pas ajouter un rôle supérieur à vos propres rôles.',
      });

    const button = new ButtonBuilder()
      .setCustomId(`kaori:roleButton-${role.id}`)
      .setStyle(interaction.message.components[0].components[1].style);

    if (emoji) {
      if (displayName) button.setLabel(displayName);
      button.setEmoji(emoji);
    } else button.setLabel(displayName || role.name);

    // Modifier le message
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageWebhooks,
      )
    )
      return interaction.reply({
        content:
          '`❌` Vous devez accorder la permission "Gérer les webhooks" au bot pour utiliser cette fonctionnalité.',
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
        content: '`❌` Un problème est survenu lors de la récupération du message.',
        ephemeral: true,
      });

    const webhook = await targetMessage.fetchWebhook().catch(() => null);
    if (!webhook || interaction.client.user.id !== webhook.owner?.id)
      return interaction.reply({
        content: '`❌` Ce message ne peut pas être mis à jour.',
        ephemeral: true,
      });
    if (targetMessage.components[4]?.components?.length === 5)
      return interaction.reply({
        content: '`❌` Aucun composant supplémentaire ne peut être ajouté !',
        ephemeral: true,
      });
    if (
      targetMessage.components[0]?.components[0]?.type ===
      ComponentType.StringSelect
    )
      return interaction.reply({
        content:
          '`❌` Les menus déroulants et les boutons ne peuvent pas être ajoutés au même message.',
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
        content: '`❌` Ce bouton de rôle a déjà été ajouté.',
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

    // Vérifier les permissions
    const dangerPermissions = getDangerPermission(role);

    if (dangerPermissions.length) {
      const message = await interaction.update({
        content: null,
        embeds: [
          EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle('`⚠️` Attention !')
            .setDescription(
              [
                `${role} possède des permissions potentiellement dangereuses.` +
                '**Voulez-vous vraiment ajouter ce rôle ?**',
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
              .setLabel('Oui')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('kaori:embedMaker-roleButton-send-disagree')
              .setLabel('Non')
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
            content: '`⌛` Ajout du composant en cours...',
            embeds: [],
            components: [],
          });
          await webhook.edit({ channel: i.channelId });
          webhook
            .editMessage(targetMessage, { components: updatedComponents })
            .then(() =>
              i.editReply({
                content: '`✅` Composant ajouté !',
                embeds,
                components,
              }),
            )
            .catch(() =>
              i.editReply({
                content: '`❌` Un problème est survenu lors de la mise à jour du composant.',
                embeds,
                components,
              }),
            );
        })
        .catch(() => {});
    } else {
      await interaction.update({
        content: '`⌛` Ajout du composant en cours...',
        embeds: [],
        components: [],
      });
      await webhook.edit({ channel: interaction.channelId });
      webhook
        .editMessage(targetMessage, { components: updatedComponents })
        .then(() =>
          interaction.editReply({
            content: '`✅` Composant ajouté !',
            embeds,
            components,
          }),
        )
        .catch(() =>
          interaction.editReply({
            content: '`❌` Un problème est survenu lors de la mise à jour du composant.',
            embeds,
            components,
          }),
        );
    }
  },
);

module.exports = [sendRoleButton, sendRoleButtonModal];
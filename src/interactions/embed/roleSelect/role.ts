import { Button, Modal } from '@akki256/discord-interaction';
import { white } from '@const/emojis';
import { getDangerPermission } from '@modules/embed';
import {
  type APISelectMenuOption,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ComponentType,
  EmbedBuilder,
  GuildEmoji,
  ModalBuilder,
  PermissionFlagsBits,
  Role,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getRoleSelectMakerButtons } from './_function';

const addRole = [
  new Button(
    { customId: 'kaori:embedMaker-selectRole-addRole' },
    async (interaction) => {
      const firstComponent = interaction.message.components[0].components[0];
      if (
        firstComponent.type === ComponentType.StringSelect &&
        firstComponent.options.length === 25
      )
        return;

      interaction.showModal(
        new ModalBuilder()
          .setCustomId('kaori:embedMaker-selectRole-addRoleModal')
          .setTitle('Ajouter un rôle')
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
                .setLabel('Nom affiché dans le menu déroulant')
                .setPlaceholder('ex. : Joueur Minecraft')
                .setMaxLength(100)
                .setStyle(TextInputStyle.Short)
                .setRequired(false),
            ),
            new ActionRowBuilder<TextInputBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId('description')
                .setLabel('Description du rôle')
                .setPlaceholder('ex. : Recommandé pour les joueurs de Minecraft !')
                .setMaxLength(100)
                .setStyle(TextInputStyle.Short)
                .setRequired(false),
            ),
            new ActionRowBuilder<TextInputBuilder>().setComponents(
              new TextInputBuilder()
                .setCustomId('emojiNameOrId')
                .setLabel('Emoji Unicode ou personnalisé')
                .setPlaceholder('Un seul caractère ; Emoji perso par nom ou ID')
                .setMaxLength(32)
                .setStyle(TextInputStyle.Short)
                .setRequired(false),
            ),
          ),
      );
    },
  ),

  new Modal(
    { customId: 'kaori:embedMaker-selectRole-addRoleModal' },
    async (interaction) => {
      if (
        !interaction.inCachedGuild() ||
        !interaction.isFromMessage() ||
        interaction.message.components[0].components[0].customId ===
          'kaori:embedMaker-selectRole-removeRoleSelect'
      )
        return;

      const emojiRegex = new RegExp(
        /\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu,
      );
      const roleNameOrId = interaction.fields.getTextInputValue('roleNameOrId');
      const emojiNameOrId =
        interaction.fields.getTextInputValue('emojiNameOrId');

      const role = interaction.guild?.roles.cache.find(
        (v) => v.name === roleNameOrId || v.id === roleNameOrId,
      );
      const emoji =
        interaction.guild?.emojis.cache.find((v) => v.name === emojiNameOrId) ||
        emojiNameOrId.match(emojiRegex)?.[0];

      if (!(role instanceof Role))
        return interaction.reply({
          content: '`❌` Aucun rôle correspondant à la valeur saisie n’a été trouvé.',
          ephemeral: true,
        });
      if (role?.managed)
        return interaction.reply({
          content:
            '`❌` Ce rôle est géré par un service externe et ne peut pas être ajouté au menu déroulant.',
          ephemeral: true,
        });
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.Administrator,
        ) &&
        interaction.member.roles.highest.position < role.position
      )
        return interaction.reply({
          content:
            '`❌` Vous ne pouvez pas ajouter un rôle supérieur à votre rôle le plus élevé.',
        });

      const newOption: APISelectMenuOption = {
        label: interaction.fields.getTextInputValue('displayName') || role.name,
        description:
          interaction.fields.getTextInputValue('description') || undefined,
        emoji: emoji
          ? emoji instanceof GuildEmoji
            ? { id: emoji.id, animated: emoji.animated ?? undefined }
            : { name: emoji }
          : undefined,
        value: role.id,
      };

      if (
        interaction.message.components[0].components[0].type !==
        ComponentType.StringSelect
      ) {
        const select = new StringSelectMenuBuilder()
          .setCustomId('kaori:roleSelectMenu')
          .setMinValues(0)
          .setOptions(newOption);

        await interaction.update({
          content: null,
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
              select,
            ),
            getRoleSelectMakerButtons(select.toJSON()),
          ],
        });
      } else {
        const select = StringSelectMenuBuilder.from(
          interaction.message.components[0].components[0],
        ).setOptions(
          interaction.message.components[0].components[0].options
            .filter((v) => v.value !== newOption.value)
            .concat(newOption),
        );

        await interaction.update({
          content: null,
          components: [
            new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
              select,
            ),
            getRoleSelectMakerButtons(select.toJSON()),
          ],
        });
      }

      const dangerPermissions = getDangerPermission(role);

      if (dangerPermissions.length)
        interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle('`⚠️` Attention !')
              .setDescription(
                `${role} possède des permissions potentiellement dangereuses.\n> ${dangerPermissions.map((v) => `\`${v}\``).join(' ')}`,
              )
              .setColor(Colors.Yellow),
          ],
          ephemeral: true,
        });
    },
  ),
];

const removeRole = [
  new Button(
    { customId: 'kaori:embedMaker-selectRole-removeRole' },
    async (interaction) => {
      const select = interaction.message.components[0].components[0];

      if (select.type !== ComponentType.StringSelect) return;
      if (select.options.length === 1)
        return interaction.update({
          components: [getRoleSelectMakerButtons()],
        });

      const indexSelectCustomId =
        'kaori:embedMaker-selectRole-removeRoleSelect';
      const backButtonCustomId =
        'kaori:embedMaker-selectRole-removeRoleSelect-back';

      const message = await interaction.update({
        content: null,
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
            new StringSelectMenuBuilder()
              .setCustomId(indexSelectCustomId)
              .setPlaceholder('Sélectionner l’élément à supprimer')
              .setOptions(
                ...select.options.map((v, index) => ({
                  ...v,
                  value: String(index),
                })),
              ),
          ),
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId(backButtonCustomId)
              .setLabel('Revenir sans supprimer')
              .setEmoji(white.reply)
              .setStyle(ButtonStyle.Danger),
          ),
        ],
        fetchReply: true,
      });

      message
        .awaitMessageComponent({
          filter: (v) =>
            [indexSelectCustomId, backButtonCustomId].includes(v.customId),
          time: 180_000,
        })
        .then((i) => {
          if (i.customId === indexSelectCustomId && i.isStringSelectMenu()) {
            const options = select.options.filter(
              (v, index) => Number(i.values[0]) !== index,
            );
            const newSelect = StringSelectMenuBuilder.from(select)
              .setOptions(options)
              .setMaxValues(options.length);

            i.update({
              components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
                  newSelect,
                ),
                getRoleSelectMakerButtons(newSelect.toJSON()),
              ],
            });
          } else if (i.customId === backButtonCustomId && i.isButton())
            i.update({
              components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
                  StringSelectMenuBuilder.from(select),
                ),
                getRoleSelectMakerButtons(select.toJSON()),
              ],
            });
        })
        .catch(() => {});
    },
  ),
];

module.exports = [...addRole, ...removeRole];
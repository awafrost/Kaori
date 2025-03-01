import { MessageContext, Modal } from '@akki256/discord-interaction';
import { gray } from '@const/emojis';
import { dashboard } from '@const/links';
import { ReportConfig } from '@models';
import { countField, scheduleField, userField } from '@modules/fields';
import { formatEmoji } from '@modules/util';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  Message,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  escapeSpoiler,
  hyperlink,
  roleMention,
} from 'discord.js';

const messageContext = new MessageContext(
  {
    name: 'Signaler le message',
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const setting = await ReportConfig.findOne({
      guildId: interaction.guild.id,
    });

    if (!setting?.channel) {
      if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: `\`❌\` Pour utiliser cette fonctionnalité, configurez un salon de réception des signalements via le tableau de bord : ${hyperlink('Définir un salon', `<${dashboard}/guilds/${interaction.guild.id}/report>`)}`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: '`❌` Cette fonctionnalité n’est pas disponible actuellement. Veuillez contacter un administrateur du serveur.',
        ephemeral: true,
      });
    }

    const message = interaction.targetMessage;
    const user = message.author;

    if (user.system || message.webhookId) {
      return interaction.reply({
        content: '`❌` Vous ne pouvez pas signaler les messages système ou les messages de webhook.',
        ephemeral: true,
      });
    }

    if (user.equals(interaction.user)) {
      return interaction.reply({
        content: '`❌` Vous ne pouvez pas vous signaler vous-même.',
        ephemeral: true,
      });
    }
    if (user.equals(interaction.client.user)) {
      return interaction.reply({
        content: `\`❌\` Vous ne pouvez pas signaler ${interaction.client.user.username}.`,
        ephemeral: true,
      });
    }

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:messageReportModal')
        .setTitle('Signaler un message')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId(interaction.targetId)
              .setLabel('Détails')
              .setPlaceholder(
                'Votre signalement ne sera visible que par les administrateurs.',
              )
              .setMaxLength(1500)
              .setStyle(TextInputStyle.Paragraph),
          ),
        ),
    );
  },
);

const messageReportModal = new Modal(
  {
    customId: 'kaori:messageReportModal',
  },
  async (interaction) => {
    if (!(interaction.inCachedGuild() && interaction.channel)) return;

    const setting = await ReportConfig.findOne({
      guildId: interaction.guild.id,
    });
    if (!setting?.channel) {
      return interaction.reply({
        content: '`❌` Une erreur est survenue lors de l’envoi de votre signalement.',
        ephemeral: true,
      });
    }

    const message = await interaction.channel.messages
      .fetch(interaction.components[0].components[0].customId)
      .catch(() => null);
    const channel = await interaction.guild.channels
      .fetch(setting.channel)
      .catch(() => null);

    if (!(message instanceof Message)) {
      return interaction.reply({
        content:
          '`❌` Le message que vous avez essayé de signaler a été supprimé ou est inaccessible au bot.',
        ephemeral: true,
      });
    }
    if (!channel?.isTextBased()) {
      return interaction.reply({
        content: '`❌` Une erreur est survenue lors de l’envoi de votre signalement.',
        ephemeral: true,
      });
    }

    channel
      .send({
        content: setting.mention.enabled
          ? setting.mention.roles.map(roleMention).join()
          : undefined,
        embeds: [
          new EmbedBuilder()
            .setTitle('`📢` Signalement de message')
            .setDescription(
              [
                userField(message.author, { label: 'Expéditeur' }),
                `${formatEmoji(gray.channel)} **Message :** ${message.url}`,
                countField(message.attachments.size, {
                  emoji: 'link',
                  color: 'gray',
                  label: 'Fichiers joints',
                }),
                scheduleField(message.createdAt, { label: 'Envoyé le' }),
                '',
                userField(interaction.user, {
                  color: 'blurple',
                  label: 'Signaleur',
                }),
              ].join('\n'),
            )
            .setColor(Colors.DarkButNotBlack)
            .setThumbnail(message.author.displayAvatarURL())
            .setFields(
              {
                name: 'Contenu du message',
                value: escapeSpoiler(message.content || 'Aucun'),
              },
              {
                name: 'Raison',
                value: interaction.components[0].components[0].value,
              },
            ),
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId('kaori:report-consider')
              .setLabel('Prendre des mesures')
              .setStyle(ButtonStyle.Primary),
          ),
        ],
      })
      .then((msg) => {
        interaction.reply({
          content: '`✅` **Merci pour votre signalement !** Il a été envoyé aux administrateurs du serveur.',
          ephemeral: true,
        });
        msg
          .startThread({ name: `Signalement pour ${message.author.username}` })
          .catch(() => {});
      })
      .catch(() =>
        interaction.reply({
          content: '`❌` Une erreur est survenue lors de l’envoi de votre signalement.',
          ephemeral: true,
        }),
      );
  },
);

export default [messageContext, messageReportModal];
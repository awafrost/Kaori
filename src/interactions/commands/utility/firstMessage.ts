import { ChatInput } from '@akki256/discord-interaction';
import { Duration } from '@modules/format';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'firstmessage',
    description: 'Envoyer un bouton menant au premier message du salon',
    options: [
      {
        name: 'content',
        description: 'Contenu du message',
        type: ApplicationCommandOptionType.String,
        maxLength: 200,
      },
      {
        name: 'label',
        description: 'Texte du bouton',
        type: ApplicationCommandOptionType.String,
        maxLength: 80,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageMessages,
    ],
  },
  { coolTime: Duration.toMS('50s') },
  (interaction) => {
    if (!(interaction.inGuild() && interaction.channel)) return;

    interaction.channel.messages
      .fetch({ after: '0', limit: 1 })
      .then((messages) => {
        const message = messages.first();
        if (!message) throw new ReferenceError();
        interaction.reply({
          content: interaction.options.getString('content') ?? undefined,
          components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
              new ButtonBuilder()
                .setLabel(
                  interaction.options.getString('label') ?? 'Aller au premier message',
                )
                .setURL(message.url)
                .setStyle(ButtonStyle.Link),
            ),
          ],
        });
      })
      .catch(() => {
        interaction.reply({
          content: `${inlineCode('❌')} Échec de la récupération du message`,
          ephemeral: true,
        });
      });
  },
);
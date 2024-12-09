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
    description: 'Send a button linking to the first message in the channel',
    options: [
      {
        name: 'content',
        description: 'Message content',
        type: ApplicationCommandOptionType.String,
        maxLength: 200,
      },
      {
        name: 'label',
        description: 'Button text',
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
                  interaction.options.getString('label') ?? 'Go to top message',
                )
                .setURL(message.url)
                .setStyle(ButtonStyle.Link),
            ),
          ],
        });
      })
      .catch(() => {
        interaction.reply({
          content: `${inlineCode('❌')} Failed to fetch the message`,
          ephemeral: true,
        });
      });
  },
);
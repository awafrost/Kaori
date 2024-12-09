import { ChatInput } from '@akki256/discord-interaction';
import { permissionField } from '@modules/fields';
import { Duration } from '@modules/format';
import { permToText } from '@modules/util';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  codeBlock,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'clear',
    description: 'Bulk delete messages sent in this channel (up to 2 weeks ago)',
    options: [
      {
        name: 'messages',
        description: 'Number of messages to delete',
        type: ApplicationCommandOptionType.Integer,
        minValue: 2,
        maxValue: 100,
        required: true,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
  },
  { coolTime: Duration.toMS('10s') },
  (interaction) => {
    if (!(interaction.inGuild() && interaction.channel)) return;
    if (!interaction.appPermissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({
        content: permissionField(permToText('ManageMessages'), {
          label: 'The bot lacks necessary permissions',
        }),
        ephemeral: true,
      });
    
    const bulkCount = interaction.options.getInteger('messages', true);

    interaction.channel
      .bulkDelete(bulkCount, true)
      .then(() =>
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('✅')} Successfully deleted ${inlineCode(
                  `${bulkCount} messages`,
                )}.`,
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        }),
      )
      .catch((err) =>
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                [
                  `${inlineCode('❌')} Failed to delete messages.`,
                  codeBlock(err),
                ].join('\n'),
              )
              .setColor(Colors.Red),
          ],
          ephemeral: true,
        }),
      );
  },
);
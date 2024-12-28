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
    description: 'Bulk delete messages with enhanced functionality',
    options: [
      {
        name: 'count',
        description: 'Number of messages to delete',
        type: ApplicationCommandOptionType.Integer,
        minValue: 1,
        maxValue: 1000,
        required: true,
      },
      {
        name: 'from',
        description: 'Delete messages from (member/bot/all)',
        type: ApplicationCommandOptionType.String,
        choices: [
          { name: 'Member', value: 'member' },
          { name: 'Bot', value: 'bot' },
          { name: 'All', value: 'all' },
        ],
      },
      {
        name: 'user',
        description: 'User to filter messages from (if "from" is "member")',
        type: ApplicationCommandOptionType.User,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
  },
  { coolTime: Duration.toMS('10s') },
  async (interaction) => {
    if (!(interaction.inGuild() && interaction.channel)) return;
    if (!interaction.appPermissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: permissionField(permToText('ManageMessages'), {
          label: 'The bot lacks necessary permissions',
        }),
        ephemeral: true,
      });
    }
    
    const bulkCount = interaction.options.getInteger('count', true);
    const from = interaction.options.getString('from') || 'all';
    const user = interaction.options.getUser('user');

    try {
      let messagesToDelete;
      const messages = await interaction.channel.messages.fetch({ limit: bulkCount });

      switch (from) {
        case 'member':
          if (!user) {
            return interaction.reply({
              content: `${inlineCode('❌')} You must specify a user when choosing to delete messages from a member.`,
              ephemeral: true,
            });
          }
          messagesToDelete = messages.filter(msg => msg.author.id === user.id);
          break;
        case 'bot':
          messagesToDelete = messages.filter(msg => msg.author.bot);
          break;
        default: // 'all'
          messagesToDelete = messages;
      }

      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${inlineCode('✅')} Successfully deleted ${inlineCode(`${deleted.size} messages`)}.`
            )
            .setColor(Colors.Green),
        ],
        ephemeral: true,
      });
    } catch (err) {
      // Convert 'err' to string to avoid the TypeScript error
      const errorMessage = (err instanceof Error) ? err.message : String(err);
      
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              [
                `${inlineCode('❌')} Failed to delete messages.`,
                codeBlock(errorMessage),
              ].join('\n'),
            )
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    }
  },
);
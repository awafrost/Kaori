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
      {
        name: 'type',
        description: 'Type of content to delete',
        type: ApplicationCommandOptionType.String,
        choices: [
          { name: 'All', value: 'all' },
          { name: 'Images', value: 'image' },
          { name: 'Videos', value: 'video' },
          { name: 'Embeds', value: 'embed' },
          { name: 'Text Only', value: 'text' },
        ],
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
    const type = interaction.options.getString('type') || 'all';

    try {
      let messagesToDelete;
      const messages = await interaction.channel.messages.fetch({ limit: bulkCount });

      // Filter messages based on 'from' option
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

      // Further filter based on content type
      switch (type) {
        case 'image':
          messagesToDelete = messagesToDelete.filter(msg => msg.attachments.size > 0 && msg.attachments.some(a => a.contentType && a.contentType.startsWith('image/')));
          break;
        case 'video':
          messagesToDelete = messagesToDelete.filter(msg => msg.attachments.size > 0 && msg.attachments.some(a => a.contentType && a.contentType.startsWith('video/')));
          break;
        case 'embed':
          messagesToDelete = messagesToDelete.filter(msg => msg.embeds.length > 0);
          break;
        case 'text':
          messagesToDelete = messagesToDelete.filter(msg => msg.content && !msg.attachments.size && msg.embeds.length === 0);
          break;
        // Default case 'all' doesn't require additional filtering
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
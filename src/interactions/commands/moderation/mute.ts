import { ChatInput } from '@akki256/discord-interaction';
import { Duration } from '@modules/format';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  bold,
  codeBlock,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'mute',
    description: 'Timeout a user (more flexible than the official feature)',
    options: [
      {
        name: 'user',
        description: 'User',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'date',
        description: 'Days',
        type: ApplicationCommandOptionType.Number,
      },
      {
        name: 'hour',
        description: 'Hours',
        type: ApplicationCommandOptionType.Number,
      },
      {
        name: 'minute',
        description: 'Minutes',
        type: ApplicationCommandOptionType.Number,
      },
      {
        name: 'reason',
        description: 'Reason',
        type: ApplicationCommandOptionType.String,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
    dmPermission: false,
  },
  { coolTime: Duration.toMS('5s') },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const member = interaction.options.getMember('user');
    const duration = Duration.toMS(
      [
        `${interaction.options.getNumber('date') ?? 0}d`,
        `${interaction.options.getNumber('hour') ?? 0}h`,
        `${interaction.options.getNumber('minute') ?? 0}m`,
      ].join(''),
    );

    if (duration <= 0)
      return interaction.reply({
        content: `${inlineCode('❌')} Total time must be at least 1 minute`,
        ephemeral: true,
      });
    if (Duration.toMS('28d') < duration)
      return interaction.reply({
        content: `${inlineCode('❌')} Timeouts cannot exceed 28 days`,
        ephemeral: true,
      });
    if (!(member instanceof GuildMember))
      return interaction.reply({
        content: `${inlineCode('❌')} This user is not in the server`,
        ephemeral: true,
      });
    if (member.user.equals(interaction.user))
      return interaction.reply({
        content: `${inlineCode('❌')} You cannot timeout yourself`,
        ephemeral: true,
      });
    if (!member.moderatable)
      return interaction.reply({
        content: `${inlineCode('❌')} You do not have permission to timeout this user`,
        ephemeral: true,
      });
    if (
      interaction.guild.ownerId !== interaction.user.id &&
      interaction.member.roles.highest.position < member.roles.highest.position
    )
      return interaction.reply({
        content: `${inlineCode('❌')} You do not have permission to timeout this user`,
        ephemeral: true,
      });

    member
      .timeout(
        duration,
        `${
          interaction.options.getString('reason') ?? 'No reason provided'
        } - ${interaction.user.tag}`,
      )
      .then(() => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('✅')} ${member} has been timed out for ${Duration.format(
                  duration,
                  `${bold('%{d}')}d ${bold('%{h}')}h ${bold('%{m}')}m`,
                )}`,
              )
              .setColor(Colors.Red),
          ],
          ephemeral: true,
        });
      })
      .catch((err) => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                [
                  `${inlineCode('❌')} Failed to timeout user`,
                  codeBlock(err),
                ].join('\n'),
              )
              .setColor(Colors.Red),
          ],
          ephemeral: true,
        });
      });
  },
);
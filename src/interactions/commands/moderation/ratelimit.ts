import { ChatInput } from '@akki256/discord-interaction';
import { permissionField } from '@modules/fields';
import { Duration } from '@modules/format';
import { permToText } from '@modules/util';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'ratelimit',
    description: 'Set the slowmode for this channel',
    options: [
      {
        name: 'duration',
        description: 'Duration in seconds',
        minValue: 0,
        maxValue: 21600,
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
  },
  { coolTime: Duration.toMS('5s') },
  (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    if (!interaction.appPermissions?.has(PermissionFlagsBits.ManageChannels))
      return interaction.reply({
        content: permissionField(permToText('ManageChannels'), {
          label: 'BOT is missing the necessary permissions',
        }),
        ephemeral: true,
      });

    const duration = interaction.options.getInteger('duration', true);
    interaction.channel
      .setRateLimitPerUser(duration, `/ratelimit by ${interaction.user.tag}`)
      .then(() => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('✅')} Set the channel slowmode to ${inlineCode(
                  `${duration} seconds`,
                )}`,
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      })
      .catch(() => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('❌')} Failed to set the slowmode`,
              )
              .setColor(Colors.Red),
          ],
        });
      });
  },
);
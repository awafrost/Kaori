import { ChatInput } from '@akki256/discord-interaction';
import { Duration } from '@modules/format';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  GuildFeature,
  PermissionFlagsBits,
  codeBlock,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'pauseinvite',
    description: 'Toggle the server invite pause state',
    options: [
      {
        name: 'pause',
        description: 'Whether to pause the invites',
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
  },
  { coolTime: Duration.toMS('50s') },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;
    const pause = interaction.options.getBoolean('pause', true);
    const guildFeatures = interaction.guild.features;
    if (guildFeatures.includes(GuildFeature.InvitesDisabled) === pause)
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${inlineCode('❌')} Already in that state`)
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });

    interaction.guild
      .edit(
        pause
          ? {
              features: [...guildFeatures, GuildFeature.InvitesDisabled],
              reason: `Pausing invites - ${interaction.user.tag}`,
            }
          : {
              features: guildFeatures.filter(
                (v) => v !== GuildFeature.InvitesDisabled,
              ),
              reason: `Enabling invites - ${interaction.user.tag}`,
            },
      )
      .then(() => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('✅')} The server invites have been ${
                  pause ? 'paused' : 'enabled'
                }`,
              )
              .setColor(Colors.Green),
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
                  `${inlineCode('❌')} Failed to change invite pause state`,
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
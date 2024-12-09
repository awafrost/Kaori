import { ChatInput } from '@akki256/discord-interaction';
import { EmbedBuilder, Colors } from 'discord.js';

export default new ChatInput(
  {
    name: 'mutelist',
    description: 'View users currently in timeout',
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const mutedMembers = interaction.guild.members.cache.filter(
      (member) => member.communicationDisabledUntilTimestamp,
    );

    const embed = new EmbedBuilder()
      .setTitle('Muted Members')
      .setColor(Colors.Orange);

    if (mutedMembers.size > 0) {
      mutedMembers.forEach((member) => {
        if (member.communicationDisabledUntilTimestamp) {
          embed.addFields({
            name: member.user.tag,
            value: `Timeout ends: <t:${Math.floor(
              member.communicationDisabledUntilTimestamp / 1000,
            )}:R>`,
          });
        }
      });
    } else {
      embed.setDescription('No members are currently muted.');
    }

    interaction.reply({ embeds: [embed] });
  },
);
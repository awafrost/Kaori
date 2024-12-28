import { ChatInput } from '@akki256/discord-interaction';
import { 
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder, 
  Colors, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Events,
  InteractionType,
  ButtonInteraction,
  StringSelectMenuInteraction,
  GuildMember
} from 'discord.js';

export default new ChatInput(
  {
    name: 'mutelist',
    description: 'View users currently in timeout with unmute option',
  },
  async (interaction: ChatInputCommandInteraction<CacheType>) => {
    if (!interaction.inCachedGuild()) return;

    const now = Date.now();
    const mutedMembers = interaction.guild.members.cache.filter(
      (member: GuildMember) => member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > now,
    );

    const embed = new EmbedBuilder()
      .setTitle('Muted Members')
      .setColor(Colors.Orange);

    if (mutedMembers.size > 0) {
      mutedMembers.forEach((member: GuildMember) => {
        if (member.communicationDisabledUntilTimestamp) {
          const timeoutEnds = Math.floor(member.communicationDisabledUntilTimestamp / 1000);
          embed.addFields({
            name: member.user.tag,
            value: `ID: ${member.id}\nTimeout ends: <t:${timeoutEnds}:R>`,
          });
        }
      });

      const unmuteButton = new ButtonBuilder()
        .setCustomId('unmuteMenu')
        .setLabel('Unmute User')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(unmuteButton);

      await interaction.reply({ embeds: [embed], components: [row] });
    } else {
      embed.setDescription('No members are currently muted.');
      await interaction.reply({ embeds: [embed] });
    }
  },
);

// Here, we assume you have a way to register this event outside of ChatInput, maybe in your main bot file or event handler
export const interactionCreateHandler = {
  name: 'mutelistInteraction',
  event: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType>) {
    if (interaction.type !== InteractionType.MessageComponent) return;

    if (interaction.isButton() && interaction.customId === 'unmuteMenu') {
      const now = Date.now();
      if (!interaction.guild) {
        await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        return;
      }
      const mutedMembers = interaction.guild.members.cache.filter(
        (member: GuildMember) => member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > now,
      );

      if (mutedMembers.size === 0) {
        await interaction.reply({ content: 'There are no muted members to unmute.', ephemeral: true });
        return;
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('selectUserToUnmute')
        .setPlaceholder('Select a user to unmute');

      mutedMembers.forEach((member: GuildMember) => {
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(member.user.tag)
            .setValue(member.id)
        );
      });

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await interaction.reply({ 
        content: 'Please select the user you want to unmute:', 
        components: [row],
        ephemeral: true 
      });
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'selectUserToUnmute') {
      if (!interaction.guild) {
        await interaction.update({ content: 'This command can only be used in a server.', components: [] });
        return;
      }
      const memberId = interaction.values[0];
      const member = await interaction.guild.members.fetch(memberId).catch(() => null);

      if (!member) {
        await interaction.update({ content: 'Member could not be found or has left the server.', components: [] });
        return;
      }

      try {
        await member.timeout(null, `Unmuted by ${interaction.user.tag}`);
        await interaction.update({ content: `Successfully unmuted ${member.user.tag}.`, components: [] });
      } catch (error) {
        console.error('Failed to unmute user:', error);
        await interaction.update({ content: `Error unmuting ${member.user.tag}.`, components: [] });
      }
    }
  }
};
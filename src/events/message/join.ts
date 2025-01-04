import { joinAndLeaveHolder } from '@const/holder';
import { JoinMessageConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { Events, type MessageCreateOptions, EmbedBuilder, Colors } from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.GuildMemberAdd,
  async execute(member) {
    const setting = await JoinMessageConfig.findOne({
      guildId: member.guild.id,
    });
    if (!setting?.enabled) return;
    if (setting.ignoreBot && member.user.bot) return;

    const channel = setting.channel
      ? await member.guild.channels.fetch(setting.channel).catch(() => null)
      : null;
    
    if (channel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor(setting.embedColor ? Colors[setting.embedColor as keyof typeof Colors] : Math.floor(Math.random()*16777215)) // ou une couleur par défaut
        .setTitle(setting.embedTitle || 'Bienvenue !')
        .setDescription(setting.embedDescription || `Bienvenue ${member.user.username} sur ${member.guild.name}!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setImage(setting.imageUrl || '');

      const messageOptions: MessageCreateOptions = {
        embeds: [embed],
      };

      if (setting.textMessage) {
        messageOptions.content = setting.textMessage;
      }

      channel.send(
        joinAndLeaveHolder.parse(messageOptions, {
          guild: member.guild,
          user: member.user,
        }),
      );
    }
  },
});
import { Blacklist, GuildConfig, MonitoredMessage, Partnership } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { Colors, EmbedBuilder, Events, type Message } from 'discord.js';

export default new DiscordEventBuilder({
  type: Events.MessageCreate,
  async execute(message: Message) {
    if (!message.inGuild() || message.author.bot) return;

    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (!config || message.channel.id !== config.channelId) return;

    // Check for CM role
    if (!message.member?.roles.cache.has(config.cmRoleId!)) {
      await message.delete();
      await message.author
        .send(`${message.author}, seuls les membres avec le rôle requis peuvent poster des partenariats.`)
        .catch(() => {});
      return;
    }

    // Detect Discord invite links
    const discordInvitePattern = /(?:https?:\/\/)?(?:www\.)?(discord\.gg\/|discord\.com\/invite\/)([a-zA-Z0-9]+)/g;
    const matches = Array.from(message.content.matchAll(discordInvitePattern));

    if (matches.length === 0) return;

    let validInvite = false;

    for (const match of matches) {
      const inviteCode = match[2];

      try {
        const invite = await message.client.fetchInvite(inviteCode);

        // Check blacklist (local and global)
        const blacklistedServer = await Blacklist.findOne({
          $or: [
            { guildId: message.guild.id, blacklistedServerId: invite.guild!.id },
            { isGlobal: true, blacklistedServerId: invite.guild!.id },
          ],
        });
        if (blacklistedServer) {
          await message.delete();
          const embed = new EmbedBuilder()
            .setTitle('Serveur Blacklisté')
            .setDescription('Le serveur que vous avez partagé est blacklisté pour les partenariats.')
            .addFields({ name: 'Raison', value: blacklistedServer.reason || 'Aucune raison spécifiée' })
            .setColor(Colors.Red);

          await message.author.send({ embeds: [embed] }).catch(async () => {
            const warning = await message.channel.send(
              `${message.author}, le serveur que vous avez partagé est blacklisté, mais je ne peux pas vous envoyer un MP.`,
            );
            setTimeout(() => warning.delete().catch(() => {}), 30000);
          });
          return;
        }

        // Check minimum members
        if (invite.memberCount < config.minMembersRequired!) {
          await message.delete();
          const warning = await message.channel.send(
            `L'invitation a été supprimée car le serveur n'a pas au moins ${config.minMembersRequired} membres.`,
          );
          setTimeout(() => warning.delete().catch(() => {}), 60000);
          return;
        }

        // Create embed with safe access to embedConfig
        const embed = new EmbedBuilder()
          .setTitle(config.embedConfig?.title || 'Partenariat')
          .setDescription(config.embedConfig?.description || 'Nouveau partenariat !')
          .setColor('#131416')
          .setImage(config.embedConfig?.image || null)
          .setThumbnail(config.embedConfig?.thumbnail || null)
          .setFooter({ text: `Serveur: ${invite.guild!.name}, Membres: ${invite.memberCount}` });

        const partnershipMessage = await message.channel.send({
          content: config.embedConfig?.mentionRoleId ? `<@&${config.embedConfig.mentionRoleId}>` : '',
          embeds: [embed],
        });

        const monitoredMessage = new MonitoredMessage({
          guildId: message.guild.id,
          channelId: message.channel.id,
          messageId: partnershipMessage.id,
          inviteCode,
          guildName: invite.guild!.name,
        });
        await monitoredMessage.save();

        // Save partnership
        const partnership = new Partnership({
          guildId: message.guild.id,
          partnerGuildId: invite.guild!.id,
          userId: message.author.id,
          messageId: partnershipMessage.id,
        });
        await partnership.save();

        validInvite = true;

        // Check invite validity after 60 seconds
        setTimeout(async () => {
          try {
            await message.client.fetchInvite(inviteCode);
          } catch (error) {
            if ((error as Error).message === 'Invalid Invite') {
              await message.delete().catch(() => {});
              const warning = await message.channel.send(
                "L'invitation est devenue invalide et le message a été supprimée.",
              );
              setTimeout(() => warning.delete().catch(() => {}), 60000);

              await MonitoredMessage.deleteOne({ messageId: partnershipMessage.id });
              await Partnership.deleteOne({ messageId: partnershipMessage.id });
            }
          }
        }, 60000);

        break; // Process only the first valid invite
      } catch (error) {
        if ((error as Error).message !== 'Unknown Invite' && (error as Error).message !== 'Invalid Invite') {
          await message.delete().catch(() => {});
          const warning = await message.channel.send("L'invitation est invalide et a été supprimée.");
          setTimeout(() => warning.delete().catch(() => {}), 60000);
        }
      }
    }

    if (!validInvite) return;
  },
});
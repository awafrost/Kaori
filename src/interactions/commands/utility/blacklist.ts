import { ChatInput } from '@akki256/discord-interaction';
import { Blacklist } from '@models';
import { Colors, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default new ChatInput(
  {
    name: 'blacklist',
    description: 'Afficher la liste des serveurs blacklistés pour les partenariats',
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  },
  { coolTime: 5000 },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const blacklist = await Blacklist.find({ guildId: interaction.guild.id });

    if (blacklist.length === 0) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Liste des serveurs blacklistés')
            .setDescription('Aucun serveur n\'est actuellement blacklisté.')
            .setColor(Colors.DarkGrey),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Serveurs blacklistés')
          .setDescription(
            blacklist
              .map(
                (entry) =>
                  `**Serveur ID:** ${entry.blacklistedServerId}\n**Raison:** ${entry.reason}`,
              )
              .join('\n\n'),
          )
          .setColor(Colors.DarkGrey)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  },
);
import { ChatInput } from '@akki256/discord-interaction';
import { Blacklist } from '@models';
import { ApplicationCommandOptionType, Colors, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default new ChatInput(
  {
    name: 'unblacklistserver',
    description: 'Retirer un serveur de la liste noire des partenariats',
    options: [
      {
        name: 'serverid',
        description: 'ID du serveur à retirer de la liste noire',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  },
  { coolTime: 5000 },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const serverId = interaction.options.getString('serverid', true);

    const blacklistEntry = await Blacklist.findOne({
      guildId: interaction.guild.id,
      blacklistedServerId: serverId,
    });

    if (!blacklistEntry) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Serveur non trouvé')
            .setDescription(`Le serveur \`${serverId}\` n'est pas dans la liste noire.`)
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    await Blacklist.deleteOne({
      guildId: interaction.guild.id,
      blacklistedServerId: serverId,
    });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Serveur retiré de la blacklist')
          .setDescription(`Le serveur \`${serverId}\` a été retiré de la liste noire.`)
          .setColor(Colors.Green),
      ],
      ephemeral: true,
    });
  },
);
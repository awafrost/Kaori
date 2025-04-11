import { ChatInput } from '@akki256/discord-interaction';
import { Blacklist } from '@models';
import { ApplicationCommandOptionType, Colors, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default new ChatInput(
  {
    name: 'blacklistserver',
    description: 'Ajouter un serveur à la liste noire des partenariats',
    options: [
      {
        name: 'serverid',
        description: 'ID du serveur à blacklister',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'reason',
        description: 'Raison du blacklist',
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
    const reason = interaction.options.getString('reason', true);

    const existingEntry = await Blacklist.findOne({
      guildId: interaction.guild.id,
      blacklistedServerId: serverId,
    });

    if (existingEntry) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Serveur déjà blacklisté')
            .setDescription(`Le serveur \`${serverId}\` est déjà dans la liste noire.`)
            .addFields({ name: 'Raison', value: existingEntry.reason })
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
      return;
    }

    const blacklistEntry = new Blacklist({
      guildId: interaction.guild.id,
      blacklistedServerId: serverId,
      reason,
      blacklistedBy: interaction.user.id,
    });

    await blacklistEntry.save();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Serveur ajouté à la blacklist')
          .setDescription(`Le serveur \`${serverId}\` a été ajouté à la liste noire.`)
          .addFields({ name: 'Raison', value: reason })
          .setColor(Colors.Green),
      ],
      ephemeral: true,
    });
  },
);
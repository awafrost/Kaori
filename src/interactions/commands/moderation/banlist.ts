import { ChatInput } from '@akki256/discord-interaction';
import { 
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder, 
  Colors, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  PermissionFlagsBits,
  ButtonInteraction,
  GuildBan,
  InteractionCollector,
  MessageComponentInteraction
} from 'discord.js';

export default new ChatInput(
  {
    name: 'banlist',
    description: 'Voir la liste des membres bannis (Modérateurs uniquement)',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    dmPermission: false,
  },
  async (interaction: ChatInputCommandInteraction<CacheType>) => {
    if (!interaction.inCachedGuild()) return;

    if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        content: 'Vous devez avoir la permission de bannir des membres pour utiliser cette commande.',
        ephemeral: true
      });
    }

    const bans = await interaction.guild.bans.fetch();
    const banArray = Array.from(bans.values());
    const totalBans = banArray.length;

    if (totalBans === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Liste des bannissements')
            .setDescription('Aucun membre n’est actuellement banni.')
            .setColor(Colors.Red)
            .setFooter({ text: 'Total des bans: 0' })
        ],
        ephemeral: true
      });
    }

    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(totalBans / ITEMS_PER_PAGE);
    let currentPage = 0;

    const generateEmbed = (page: number) => {
      const start = page * ITEMS_PER_PAGE;
      const end = Math.min(start + ITEMS_PER_PAGE, totalBans);
      const currentBans = banArray.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle('Liste des bannissements')
        .setColor(Colors.Red)
        .setFooter({ 
          text: `Page ${page + 1}/${totalPages} | Total des bans: ${totalBans}` 
        });

      currentBans.forEach((ban: GuildBan) => {
        embed.addFields({
          name: ban.user.tag,
          value: `ID: ${ban.user.id}\nRaison: ${ban.reason || 'Aucune raison spécifiée'}`,
        });
      });

      return embed;
    };

    const generateButtons = (page: number) => {
      const previousButton = new ButtonBuilder()
        .setCustomId('previous_banlist')
        .setLabel('Précédent')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0);

      const nextButton = new ButtonBuilder()
        .setCustomId('next_banlist')
        .setLabel('Suivant')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages - 1);

      return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(previousButton, nextButton);
    };

    const message = await interaction.reply({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons(currentPage)],
      ephemeral: true,
      fetchReply: true
    });

    const filter = (i: MessageComponentInteraction): i is ButtonInteraction => 
      (i.isButton() && (i.customId === 'previous_banlist' || i.customId === 'next_banlist'));

    const collector = interaction.channel?.createMessageComponentCollector({
      filter,
      time: 60000
    }) as InteractionCollector<ButtonInteraction>;

    collector?.on('collect', async (i: ButtonInteraction) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: 'Seul l’utilisateur ayant exécuté la commande peut utiliser ces boutons.',
          ephemeral: true
        });
      }

      currentPage = i.customId === 'next_banlist' ? currentPage + 1 : currentPage - 1;
      await i.update({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)]
      });
    });

    collector?.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
);
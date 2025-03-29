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
  GuildMember,
  InteractionCollector,
  MessageComponentInteraction
} from 'discord.js';

export default new ChatInput(
  {
    name: 'mutelist',
    description: 'Voir les utilisateurs actuellement en isolement (Modérateurs uniquement)',
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
    dmPermission: false,
  },
  async (interaction: ChatInputCommandInteraction<CacheType>) => {
    if (!interaction.inCachedGuild()) return;

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: 'Vous devez avoir la permission de modérer les membres pour utiliser cette commande.',
        ephemeral: true
      });
    }

    const now = Date.now();
    const mutedMembers = interaction.guild.members.cache.filter(
      (member: GuildMember) => 
        member.communicationDisabledUntilTimestamp && 
        member.communicationDisabledUntilTimestamp > now
    );
    const mutedArray = Array.from(mutedMembers.values());
    const totalMuted = mutedArray.length;

    if (totalMuted === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Liste des membres en isolement')
            .setDescription('Aucun membre n’est actuellement en isolement.')
            .setColor(Colors.Orange)
            .setFooter({ text: 'Total des mutes: 0' })
        ],
        ephemeral: true
      });
    }

    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(totalMuted / ITEMS_PER_PAGE);
    let currentPage = 0;

    const generateEmbed = (page: number) => {
      const start = page * ITEMS_PER_PAGE;
      const end = Math.min(start + ITEMS_PER_PAGE, totalMuted);
      const currentMuted = mutedArray.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle('Liste des membres en isolement')
        .setColor(Colors.Orange)
        .setFooter({ 
          text: `Page ${page + 1}/${totalPages} | Total des mutes: ${totalMuted}` 
        });

      currentMuted.forEach((member: GuildMember) => {
        const timeRemaining = member.communicationDisabledUntilTimestamp! - now;
        const remainingSeconds = Math.floor(timeRemaining / 1000);
        embed.addFields({
          name: member.user.tag,
          value: `ID: ${member.id}\nTemps restant: <t:${Math.floor(now / 1000) + remainingSeconds}:R>`,
        });
      });

      return embed;
    };

    const generateButtons = (page: number) => {
      const previousButton = new ButtonBuilder()
        .setCustomId('previous_mutelist')
        .setLabel('Précédent')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0);

      const nextButton = new ButtonBuilder()
        .setCustomId('next_mutelist')
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
      (i.isButton() && (i.customId === 'previous_mutelist' || i.customId === 'next_mutelist'));

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

      currentPage = i.customId === 'next_mutelist' ? currentPage + 1 : currentPage - 1;
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
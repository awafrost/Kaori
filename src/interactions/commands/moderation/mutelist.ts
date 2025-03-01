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
    description: 'Voir les utilisateurs actuellement en isolement avec une option pour les réactiver',
  },
  async (interaction: ChatInputCommandInteraction<CacheType>) => {
    if (!interaction.inCachedGuild()) return;

    const now = Date.now();
    const mutedMembers = interaction.guild.members.cache.filter(
      (member: GuildMember) => member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > now,
    );

    const embed = new EmbedBuilder()
      .setTitle('Membres en isolement')
      .setColor(Colors.Orange);

    if (mutedMembers.size > 0) {
      mutedMembers.forEach((member: GuildMember) => {
        if (member.communicationDisabledUntilTimestamp) {
          const timeoutEnds = Math.floor(member.communicationDisabledUntilTimestamp / 1000);
          embed.addFields({
            name: member.user.tag,
            value: `ID : ${member.id}\nFin de l’isolement : <t:${timeoutEnds}:R>`,
          });
        }
      });

      const unmuteButton = new ButtonBuilder()
        .setCustomId('unmuteMenu')
        .setLabel('Réactiver un utilisateur')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(unmuteButton);

      await interaction.reply({ embeds: [embed], components: [row] });
    } else {
      embed.setDescription('Aucun membre n’est actuellement en isolement.');
      await interaction.reply({ embeds: [embed] });
    }
  },
);

// Register interaction handler within the same file
export const interactionCreateHandler = {
  name: 'mutelistInteraction',
  execute: async (interaction: ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType>) => {
    if (interaction.type !== InteractionType.MessageComponent) return;

    if (interaction.isButton() && interaction.customId === 'unmuteMenu') {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Cette commande ne peut être utilisée que dans un serveur.', ephemeral: true });
        return;
      }
      const now = Date.now();
      const mutedMembers = interaction.guild.members.cache.filter(
        (member: GuildMember) => member.communicationDisabledUntilTimestamp && member.communicationDisabledUntilTimestamp > now,
      );

      if (mutedMembers.size === 0) {
        await interaction.reply({ content: 'Il n’y a aucun membre en isolement à réactiver.', ephemeral: true });
        return;
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('selectUserToUnmute')
        .setPlaceholder('Sélectionnez un utilisateur à réactiver');

      mutedMembers.forEach((member: GuildMember) => {
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(member.user.tag)
            .setValue(member.id)
        );
      });

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await interaction.reply({ 
        content: 'Veuillez sélectionner l’utilisateur que vous souhaitez réactiver :', 
        components: [row],
        ephemeral: true 
      });
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'selectUserToUnmute') {
      if (!interaction.guild) {
        await interaction.update({ content: 'Cette commande ne peut être utilisée que dans un serveur.', components: [] });
        return;
      }
      const memberId = interaction.values[0];
      const member = await interaction.guild.members.fetch(memberId).catch(() => null);

      if (!member) {
        await interaction.update({ content: 'Le membre n’a pas pu être trouvé ou a quitté le serveur.', components: [] });
        return;
      }

      try {
        await member.timeout(null, `Réactivé par ${interaction.user.tag}`);
        await interaction.update({ content: `${member.user.tag} a été réactivé avec succès.`, components: [] });
      } catch (error) {
        console.error('Échec de la réactivation de l’utilisateur :', error);
        await interaction.update({ content: `Erreur lors de la réactivation de ${member.user.tag}. Veuillez vérifier les permissions du bot.`, components: [] });
      }
    }
  }
};
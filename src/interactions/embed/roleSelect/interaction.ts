import { SelectMenu, SelectMenuType } from '@akki256/discord-interaction';
import { Colors, EmbedBuilder, MessageFlags } from 'discord.js';

const roleSelect = new SelectMenu(
  {
    customId: /^kaori:roleSelectMenu(-[1-5])?$|^reactionRole$/,
    type: SelectMenuType.String,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;
    if (interaction.message.flags.has(MessageFlags.Ephemeral))
      return interaction.update({});

    await interaction.deferReply({ ephemeral: true });

    const roles = interaction.member.roles;
    let error = false;

    // Stocker les rôles actuels avant modification
    const previousRoles = new Set(roles.cache.map(role => role.id));
    const availableOptions = interaction.component.options.map(opt => opt.value);
    const selectedRoles = interaction.values;

    // Rôles à supprimer (présents dans les options mais non sélectionnés)
    const rolesToRemove = availableOptions.filter(
      opt => !selectedRoles.includes(opt) && previousRoles.has(opt)
    );
    
    // Rôles à ajouter (sélectionnés mais pas encore présents)
    const rolesToAdd = selectedRoles.filter(
      roleId => !previousRoles.has(roleId)
    );

    // Appliquer les modifications
    await roles
      .remove(rolesToRemove)
      .catch(() => (error = true));
    await roles
      .add(rolesToAdd)
      .catch(() => (error = true));

    if (error) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setDescription('`❌` Certains rôles n’ont pas pu être ajoutés ou supprimés.')
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    }

    // Construire le message de l'embed
    const embedDescription = [
      '`✅` Les rôles ont été mis à jour !',
      rolesToAdd.length > 0 ? `**Ajoutés :** ${rolesToAdd.map(id => `<@&${id}>`).join(', ')}` : '',
      rolesToRemove.length > 0 ? `**Supprimés :** ${rolesToRemove.map(id => `<@&${id}>`).join(', ')}` : ''
    ]
    .filter(line => line !== '')
    .join('\n');

    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setDescription(embedDescription)
          .setColor(Colors.Green),
      ],
      ephemeral: true,
    });

    setTimeout(() => interaction.deleteReply(), 3_000);
  },
);

module.exports = [roleSelect];
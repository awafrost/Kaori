import { Button } from '@akki256/discord-interaction';
import { Colors, EmbedBuilder, codeBlock, roleMention } from 'discord.js';

const button = new Button(
  { customId: /^kaori:roleButton-[0-9]{18,19}/ },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const roleId = interaction.customId.replace('kaori:roleButton-', '');
    const roles = interaction.member.roles;

    if (roles.cache.has(roleId))
      roles
        .remove(roleId)
        .then(async () => {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `\`✅\` Le rôle ${roleMention(roleId)} a été supprimé avec succès.`,
                )
                .setColor(Colors.Green),
            ],
            ephemeral: true,
          });
          setTimeout(() => interaction.deleteReply(), 3_000);
        })
        .catch((e) => {
          interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `\`❌\` Échec de la suppression du rôle.\n${codeBlock(e)}`,
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
        });
    else
      roles
        .add(roleId)
        .then(async () => {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `\`✅\` Le rôle ${roleMention(roleId)} a été ajouté avec succès.`,
                )
                .setColor(Colors.Green),
            ],
            ephemeral: true,
          });
          setTimeout(() => interaction.deleteReply(), 3_000);
        })
        .catch((e) => {
          interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  `\`❌\` Échec de l’ajout du rôle.\n${codeBlock(e)}`,
                )
                .setColor(Colors.Red),
            ],
            ephemeral: true,
          });
        });
  },
);

module.exports = [button];
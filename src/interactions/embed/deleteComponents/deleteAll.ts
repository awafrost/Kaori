import { Button } from '@akki256/discord-interaction';
import { PermissionFlagsBits } from 'discord.js';

const button = new Button(
  { customId: 'kaori-js:manageComponents-deleteAll' },
  async (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageWebhooks,
      )
    )
      return interaction.reply({
        content:
          '`❌` Vous devez donner au bot la permission `Gérer les webhooks` pour utiliser cette fonctionnalité.',
        ephemeral: true,
      });

    const targetId =
      interaction.message.embeds[0].footer?.text.match(/[0-9]{18,19}/)?.[0];
    if (!targetId) return;
    const targetMessage = await (await interaction.channel.fetch()).messages
      .fetch(targetId)
      .catch(() => undefined);

    if (!targetMessage)
      return interaction.reply({
        content: '`❌` Un problème est survenu lors de la récupération du message.',
        ephemeral: true,
      });

    const webhook = await targetMessage.fetchWebhook().catch(() => null);
    if (!webhook || interaction.client.user.id !== webhook.owner?.id)
      return interaction.reply({
        content: '`❌` Ce message ne peut pas être mis à jour.',
        ephemeral: true,
      });

    await interaction.update({
      content: '`⌛` Suppression des composants en cours...',
      embeds: [],
      components: [],
    });

    webhook
      .editMessage(targetMessage, { components: [] })
      .then(() => interaction.editReply('`✅` Les composants ont été supprimés.'))
      .catch(() =>
        interaction.editReply('`❌` Échec de la suppression des composants.'),
      );
  },
);

module.exports = [button];
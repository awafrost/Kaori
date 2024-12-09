import { Button } from '@akki256/discord-interaction';
import { PermissionFlagsBits } from 'discord.js';

const editEmbedButton = new Button(
  { customId: 'kaori:embedMaker-edit' },
  async (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageWebhooks))
      return interaction.reply({ content: '`❌` To use this feature, the BOT needs the `Manage Webhooks` permission.', ephemeral: true });

    const targetId = interaction.message.content.match(/[0-9]{18,19}/)?.[0];
    const targetMessage = await (await interaction.channel.fetch()).messages.fetch(targetId || '').catch(() => undefined);
    if (!targetMessage)
      return interaction.reply({ content: '`❌` There was an issue fetching the message.', ephemeral: true });

    const webhook = await targetMessage.fetchWebhook().catch(() => null);
    if (!webhook || interaction.client.user.id !== webhook.owner?.id)
      return interaction.reply({ content: '`❌` This message cannot be updated.', ephemeral: true });

    const embeds = interaction.message.embeds;
    const components = interaction.message.components;
    await interaction.update({ content: '`⌛` Editing the embed...', embeds: [], components: [] });
    await webhook.edit({ channel: interaction.channelId });

    webhook
      .editMessage(targetMessage, { embeds })
      .then(() => interaction.editReply('`✅` Embed has been edited!'))
      .catch(() => {
        interaction.editReply({ content: null, embeds, components });
        interaction.followUp({ content: '`❌` There was an issue editing the embed.', ephemeral: true });
      });
  },
);

module.exports = [editEmbedButton];
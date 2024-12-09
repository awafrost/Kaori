import { Button } from '@akki256/discord-interaction';
import { PermissionFlagsBits, type User } from 'discord.js';

const sendEmbedButton = new Button(
  { customId: 'kaori:embedMaker-send' },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageWebhooks,
      )
    )
      return interaction.reply({
        content:
          '`❌` To use this feature, the bot needs to have the `Manage Webhooks` permission.',
        ephemeral: true,
      });

    const embeds = interaction.message.embeds;
    const components = interaction.message.components;
    await interaction.update({
      content: '`⌛` Sending the embed...',
      embeds: [],
      components: [],
    });

    const webhook =
      (await (
        await interaction.guild.fetchWebhooks()
      )
        .find((v) => interaction.client.user.equals(v.owner as User))
        ?.edit({ channel: interaction.channelId })) ||
      (await interaction.guild.channels.createWebhook({
        name: 'Kaori.js',
        avatar: interaction.client.user.displayAvatarURL(),
        channel: interaction.channelId,
      }));

    webhook
      .send({ embeds })
      .then(() =>
        interaction.editReply(
          '`✅` Embed sent successfully!\n(You can edit the embed or export it by going to `App` → `Edit Embed`, and create role assignment buttons!)',
        ),
      )
      .catch(() => {
        interaction.editReply({ content: null, embeds, components });
        interaction.followUp({
          content: '`❌` Failed to send the embed.',
          ephemeral: true,
        });
      });
  },
);

module.exports = [sendEmbedButton];
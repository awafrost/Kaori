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
 '`❌` Pour utiliser cette fonctionnalité, le bot doit avoir la permission `Gérer les webhooks`.',
 ephemeral: true,
 });

 const embeds = interaction.message.embeds;
 const components = interaction.message.components;
 await interaction.update({
 content: '`⌛` Envoi de l’embed en cours...',
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
 '`✅` Embed envoyé avec succès !\n(Vous pouvez modifier l’embed ou l’exporter en allant dans `App` → `Modifier l’embed`, et créer des boutons d’attribution de rôles !)',
 ),
 )
 .catch(() => {
 interaction.editReply({ content: null, embeds, components });
 interaction.followUp({
 content: '`❌` Échec de l’envoi de l’embed.',
 ephemeral: true,
 });
 });
 },
);

module.exports = [sendEmbedButton];
import { ChatInput } from '@akki256/discord-interaction';
import {
 ApplicationCommandOptionType,
 Colors,
 EmbedBuilder,
 PermissionFlagsBits,
 inlineCode,
} from 'discord.js';

export default new ChatInput(
 {
 name: 'ban',
 description: 'Bannir un utilisateur du serveur et le notifier par message privé',
 options: [
 {
 name: 'user',
 description: 'Utilisateur à bannir',
 type: ApplicationCommandOptionType.User,
 required: true,
 },
 {
 name: 'reason',
 description: 'Raison du bannissement',
 type: ApplicationCommandOptionType.String,
 required: false,
 },
 ],
 defaultMemberPermissions: PermissionFlagsBits.BanMembers,
 dmPermission: false,
 },
 async (interaction) => {
 if (!interaction.inCachedGuild()) return;

 const user = interaction.options.getUser('user');
 if (!user) {
 return interaction.reply({ content: 'Utilisateur non trouvé', ephemeral: true });
 }

 const reason = interaction.options.getString('reason') ?? 'Aucune raison fournie';

 try {
 // Envoi du DM avant le ban
 await user.send({
 embeds: [
 new EmbedBuilder()
 .setDescription(
 `${inlineCode('❌')} Vous avez été banni de **${interaction.guild.name}**`
 )
 .addFields({ name: 'Raison', value: reason })
 .setColor(Colors.Red),
 ],
 }).catch(() => {
 // Ignore si l'envoi échoue (DM désactivés ou autres restrictions)
 });

 // Bannir l'utilisateur
 await interaction.guild.members.ban(user, { reason: `${reason} - ${interaction.user.tag}` });

 // Confirmation publique
 interaction.reply({
 embeds: [
 new EmbedBuilder()
 .setDescription(`${inlineCode('✅')} ${user.tag} a été banni.`)
 .addFields({ name: 'Raison', value: reason })
 .setColor(Colors.Red),
 ],
 });
 } catch (err) {
 console.error('Ban Error:', err); // Pour déboguer
 interaction.reply({
 content: `${inlineCode('❌')} Échec du bannissement de l'utilisateur. Veuillez vérifier mes permissions ou le statut de la cible.`,
 ephemeral: true,
 });
 }
 }
);
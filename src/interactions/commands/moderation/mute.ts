import { ChatInput } from '@akki256/discord-interaction';
import { Duration } from '@modules/format';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  bold,
  codeBlock,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'mute',
    description: 'Mettre un utilisateur en isolement (plus flexible que la fonction officielle)',
    options: [
      {
        name: 'user',
        description: 'Utilisateur',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'date',
        description: 'Jours',
        type: ApplicationCommandOptionType.Number,
      },
      {
        name: 'hour',
        description: 'Heures',
        type: ApplicationCommandOptionType.Number,
      },
      {
        name: 'minute',
        description: 'Minutes',
        type: ApplicationCommandOptionType.Number,
      },
      {
        name: 'reason',
        description: 'Raison',
        type: ApplicationCommandOptionType.String,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
    dmPermission: false,
  },
  { coolTime: Duration.toMS('5s') },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const member = interaction.options.getMember('user');
    const duration = Duration.toMS(
      [
        `${interaction.options.getNumber('date') ?? 0}d`,
        `${interaction.options.getNumber('hour') ?? 0}h`,
        `${interaction.options.getNumber('minute') ?? 0}m`,
      ].join(''),
    );

    if (duration <= 0)
      return interaction.reply({
        content: `${inlineCode('❌')} La durée totale doit être d’au moins 1 minute`,
        ephemeral: true,
      });
    if (Duration.toMS('28d') < duration)
      return interaction.reply({
        content: `${inlineCode('❌')} Les isolements ne peuvent pas dépasser 28 jours`,
        ephemeral: true,
      });
    if (!(member instanceof GuildMember))
      return interaction.reply({
        content: `${inlineCode('❌')} Cet utilisateur n’est pas sur le serveur`,
        ephemeral: true,
      });
    if (member.user.equals(interaction.user))
      return interaction.reply({
        content: `${inlineCode('❌')} Vous ne pouvez pas vous mettre en isolement vous-même`,
        ephemeral: true,
      });
    if (!member.moderatable)
      return interaction.reply({
        content: `${inlineCode('❌')} Vous n’avez pas la permission de mettre cet utilisateur en isolement`,
        ephemeral: true,
      });
    if (
      interaction.guild.ownerId !== interaction.user.id &&
      interaction.member.roles.highest.position < member.roles.highest.position
    )
      return interaction.reply({
        content: `${inlineCode('❌')} Vous n’avez pas la permission de mettre cet utilisateur en isolement`,
        ephemeral: true,
      });

    member
      .timeout(
        duration,
        `${
          interaction.options.getString('reason') ?? 'Aucune raison fournie'
        } - ${interaction.user.tag}`,
      )
      .then(() => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('✅')} ${member} a été mis en isolement pendant ${Duration.format(
                  duration,
                  `${bold('%{d}')} jours ${bold('%{h}')} heures ${bold('%{m}')} minutes`,
                )}`,
              )
              .setColor(Colors.Red),
          ],
          ephemeral: true,
        });
      })
      .catch((err) => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                [
                  `${inlineCode('❌')} Échec de la mise en isolement de l’utilisateur`,
                  codeBlock(err),
                ].join('\n'),
              )
              .setColor(Colors.Red),
          ],
          ephemeral: true,
        });
      });
  },
);
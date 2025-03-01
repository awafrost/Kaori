import { ChatInput, UserContext } from '@akki256/discord-interaction';
import { userFlag } from '@const/emojis';
import {
  countField,
  idField,
  nicknameField,
  permissionField,
  scheduleField,
  userField,
} from '@modules/fields';
import { formatEmoji, permToText } from '@modules/util';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  GuildFeature,
  PermissionFlagsBits,
  time,
} from 'discord.js';
import type {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  RoleManager,
  User,
  UserContextMenuCommandInteraction,
} from 'discord.js';

const featureTexts: Partial<Record<GuildFeature, string>> = {
  [GuildFeature.Partnered]: 'Serveur partenaire',
  [GuildFeature.Verified]: 'Serveur vérifié',
  [GuildFeature.Discoverable]: 'Serveur découvrable',
};

const command = new ChatInput(
  {
    name: 'info',
    description: 'Commande d’information',
    options: [
      {
        name: 'user',
        description: 'Informations sur un utilisateur',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'Utilisateur',
            type: ApplicationCommandOptionType.User,
            required: true,
          },
        ],
      },
      {
        name: 'server',
        description: 'Informations sur le serveur',
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const subCommand = interaction.options.getSubcommand();

    if (subCommand === 'user')
      return interaction.reply({
        embeds: [
          await createUserInfo(
            interaction,
            interaction.options.getUser('user', true),
          ),
        ],
        ephemeral: true,
      });
    if (subCommand === 'server')
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(interaction.guild.name)
            .setDescription(
              [
                idField(interaction.guild.id, { label: 'ID du serveur' }),
                userField(
                  await interaction.guild.fetchOwner().then((v) => v.user),
                  { label: 'Propriétaire' },
                ),
                countField(interaction.guild.memberCount, {
                  emoji: 'member',
                  color: 'white',
                  label: 'Nombre de membres',
                }),
                countField(
                  interaction.guild.channels.channelCountWithoutThreads,
                  {
                    emoji: 'channel',
                    color: 'white',
                    label: 'Nombre de salons',
                  },
                ),
                scheduleField(interaction.guild.createdAt, {
                  label: 'Date de création du serveur',
                }),
                countField(interaction.guild.premiumSubscriptionCount ?? 0, {
                  emoji: 'boost',
                  color: 'white',
                  label: 'Nombre de boosts',
                }),
              ].join('\n'),
            )
            .setColor(Colors.White)
            .setThumbnail(interaction.guild.iconURL())
            .setFields(
              {
                name: 'Statut',
                value:
                  interaction.guild.features
                    .flatMap((feature) => featureTexts[feature] ?? [])
                    .join('\n') || 'Aucun',
              },
            ),
        ],
        ephemeral: true,
      });
  },
);

const context = new UserContext(
  {
    name: 'Informations sur l’utilisateur',
    dmPermission: false,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    return interaction.reply({
      embeds: [await createUserInfo(interaction, interaction.targetUser)],
      ephemeral: true,
    });
  },
);
export default [command, context];

async function createUserInfo(
  interaction:
    | ChatInputCommandInteraction<'cached'>
    | UserContextMenuCommandInteraction<'cached'>,
  user: User,
) {
  const member = await interaction.guild?.members
    .fetch(user.id)
    .catch(() => null);

  const userAvatar = user.displayAvatarURL();
  const userFlags = user.flags?.toArray().flatMap((flag) => {
    const emoji = userFlag[flag];
    if (!emoji) return [];
    return formatEmoji(emoji);
  });

  const embed = new EmbedBuilder()
    .setAuthor({ name: user.tag })
    .setTitle(member ? null : 'Cet utilisateur n’est pas sur ce serveur')
    .setDescription(
      [member ? nicknameField(member) : '', idField(user.id)]
        .filter(Boolean)
        .join('\n'),
    )
    .setColor(member ? member.displayColor || Colors.White : Colors.DarkerGrey)
    .setThumbnail(userAvatar)
    .setFields(
      {
        name: 'Date de création du compte',
        value: time(user.createdAt, 'D'),
        inline: true,
      },
      {
        name: 'Badges',
        value: userFlags?.join(' ') || 'Aucun',
        inline: true,
      },
    );

  if (!member) return embed;
  embed
    .spliceFields(1, 0, {
      name: 'Date d’arrivée sur le serveur',
      value: member.joinedAt ? time(member.joinedAt, 'D') : 'Erreur',
      inline: true,
    })
    .addFields({
      name: 'Rôles',
      value: roleList(member.roles),
    });

  if (member.premiumSince) {
    embed.addFields({
      name: 'Début du boost',
      value: `${time(member.premiumSince, 'D')} (${time(
        member.premiumSince,
        'R',
      )})`,
    });
  }

  if (
    member.isCommunicationDisabled() &&
    interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
  ) {
    embed.addFields({
      name: 'Date de fin d’isolement',
      value: `${time(member.communicationDisabledUntil, 'D')} (${time(
        member.communicationDisabledUntil,
        'R',
      )})`,
    });
  }

  const memberAvatar = member.displayAvatarURL();
  if (memberAvatar !== userAvatar) {
    embed
      .setAuthor({ name: user.tag, iconURL: userAvatar })
      .setThumbnail(memberAvatar);
  }
  return embed;
}

function roleList(roles: RoleManager | GuildMemberRoleManager) {
  return (
    roles.cache
      .filter((role) => role.id !== role.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString())
      .join(' ') || 'Aucun'
  );
}
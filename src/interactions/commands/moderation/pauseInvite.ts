import { ChatInput } from '@akki256/discord-interaction';
import { Duration } from '@modules/format';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  GuildFeature,
  PermissionFlagsBits,
  codeBlock,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'pauseinvite',
    description: 'Activer ou désactiver la pause des invitations du serveur',
    options: [
      {
        name: 'pause',
        description: 'Mettre les invitations en pause ou non',
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
  },
  { coolTime: Duration.toMS('50s') },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;
    const pause = interaction.options.getBoolean('pause', true);
    const guildFeatures = interaction.guild.features;
    if (guildFeatures.includes(GuildFeature.InvitesDisabled) === pause)
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${inlineCode('❌')} Déjà dans cet état`)
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });

    interaction.guild
      .edit(
        pause
          ? {
              features: [...guildFeatures, GuildFeature.InvitesDisabled],
              reason: `Mise en pause des invitations - ${interaction.user.tag}`,
            }
          : {
              features: guildFeatures.filter(
                (v) => v !== GuildFeature.InvitesDisabled,
              ),
              reason: `Activation des invitations - ${interaction.user.tag}`,
            },
      )
      .then(() => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('✅')} Les invitations du serveur ont été ${
                  pause ? 'mises en pause' : 'activées'
                }`,
              )
              .setColor(Colors.Green),
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
                  `${inlineCode('❌')} Échec de la modification de l’état des invitations`,
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
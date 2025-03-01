import { ChatInput } from '@akki256/discord-interaction';
import { permissionField } from '@modules/fields';
import { Duration } from '@modules/format';
import { permToText } from '@modules/util';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'ratelimit',
    description: 'Définir le mode lent pour ce salon',
    options: [
      {
        name: 'duration',
        description: 'Durée en secondes',
        minValue: 0,
        maxValue: 21600,
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
  },
  { coolTime: Duration.toMS('5s') },
  (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    if (!interaction.appPermissions?.has(PermissionFlagsBits.ManageChannels))
      return interaction.reply({
        content: permissionField(permToText('ManageChannels'), {
          label: 'Le bot n’a pas les permissions nécessaires',
        }),
        ephemeral: true,
      });

    const duration = interaction.options.getInteger('duration', true);
    interaction.channel
      .setRateLimitPerUser(duration, `/ratelimit par ${interaction.user.tag}`)
      .then(() => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('✅')} Le mode lent du salon a été défini à ${inlineCode(
                  `${duration} secondes`,
                )}`,
              )
              .setColor(Colors.Green),
          ],
          ephemeral: true,
        });
      })
      .catch(() => {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${inlineCode('❌')} Échec de la définition du mode lent`,
              )
              .setColor(Colors.Red),
          ],
        });
      });
  },
);
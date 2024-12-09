import { Button, ChatInput } from '@akki256/discord-interaction';
import { Captcha } from '@modules/captcha';
import { permissionField } from '@modules/fields';
import { Duration } from '@modules/format';
import { permToText } from '@modules/util';
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  GuildMemberRoleManager,
  PermissionFlagsBits,
  inlineCode,
} from 'discord.js';

const duringAuthentication = new Set<string>();

const verifyTypes = {
  button: 'Button',
  image: 'Image',
} satisfies Record<string, string>;
type VerifyType = keyof typeof verifyTypes;

const verifyCommand = new ChatInput(
  {
    name: 'verify',
    description: 'Create a verification panel using roles',
    options: [
      {
        name: 'type',
        description: 'Verification type',
        choices: Object.entries(verifyTypes).map(([value, name]) => ({
          name,
          value,
        })),
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'role',
        description: 'Role to assign upon successful verification',
        type: ApplicationCommandOptionType.Role,
        required: true,
      },
      {
        name: 'description',
        description: 'Embed description (use two spaces for line breaks)',
        type: ApplicationCommandOptionType.String,
        maxLength: 4096,
      },
      {
        name: 'color',
        description: 'Embed color',
        type: ApplicationCommandOptionType.Number,
        choices: [
          { name: '🔴 Red', value: Colors.Red },
          { name: '🟠 Orange', value: Colors.Orange },
          { name: '🟡 Yellow', value: Colors.Yellow },
          { name: '🟢 Green', value: Colors.Green },
          { name: '🔵 Blue', value: Colors.Blue },
          { name: '🟣 Purple', value: Colors.Purple },
          { name: '⚪ White', value: Colors.White },
          { name: '⚫ Black', value: Colors.DarkButNotBlack },
        ],
      },
      {
        name: 'image',
        description: 'Image',
        type: ApplicationCommandOptionType.Attachment,
      },
    ],
    defaultMemberPermissions: [
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.ManageChannels,
    ],
    dmPermission: false,
  },
  (interaction) => {
    if (!interaction.inCachedGuild()) return;
    const role = interaction.options.getRole('role', true);
    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageRoles,
      )
    )
      return interaction.reply({
        content: permissionField(permToText('ManageRoles'), {
          label: 'The bot lacks the necessary permissions',
        }),
        ephemeral: true,
      });
    if (role.managed || role.id === interaction.guild.roles.everyone.id)
      return interaction.reply({
        content: `${inlineCode('❌')} That role cannot be used for verification`,
        ephemeral: true,
      });
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
      interaction.member.roles.highest.position < role.position
    )
      return interaction.reply({
        content: `${inlineCode(
          '❌',
        )} You cannot use a role higher than your own for verification`,
        ephemeral: true,
      });
    if (!role.editable)
      return interaction.reply({
        content: `${inlineCode(
          '❌',
        )} You cannot use a role higher than the bot's for verification`,
        ephemeral: true,
      });

    const verifyType: VerifyType = interaction.options.getString(
      'type',
      true,
    ) as VerifyType;

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${inlineCode('✅')} Verification: ${verifyTypes[verifyType]}`)
          .setDescription(
            interaction.options.getString('description')?.replace('  ', '\n') ||
              null,
          )
          .setColor(interaction.options.getNumber('color') ?? Colors.Green)
          .setImage(interaction.options.getAttachment('image')?.url || null)
          .setFields({
            name: 'Role to assign',
            value: role.toString(),
          }),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId(`kaori-js:verify-${verifyType}`)
            .setLabel('Verify')
            .setStyle(ButtonStyle.Success),
        ),
      ],
    });
  },
);

const verifyButton = new Button(
  {
    customId: /^kaori-js:verify-(button|image)$/,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild()) return;

    const roleId =
      interaction.message.embeds[0]?.fields[0]?.value?.match(
        /(?<=<@&)\d+(?=>)/,
      )?.[0];
    const roles = interaction.member.roles;

    if (duringAuthentication.has(interaction.user.id))
      return interaction.reply({
        content: `${inlineCode(
          '❌',
        )} You are currently undergoing another verification. You cannot start a new verification until the current one is finished.`,
        ephemeral: true,
      });
    if (!roleId || !(roles instanceof GuildMemberRoleManager))
      return interaction.reply({
        content: `${inlineCode('❌')} There was an issue during verification.`,
        ephemeral: true,
      });
    if (roles.cache.has(roleId))
      return interaction.reply({
        content: `${inlineCode('✅')} You are already verified.`,
        ephemeral: true,
      });

    if (interaction.customId === 'kaori-js:verify-button') {
      roles
        .add(roleId, 'Verification')
        .then(() =>
          interaction.reply({
            content: `${inlineCode('✅')} Verification successful!`,
            ephemeral: true,
          }),
        )
        .catch(() =>
          interaction.reply({
            content: `${inlineCode(
              '❌',
            )} Failed to assign the role. Please contact a server admin.`,
            ephemeral: true,
          }),
        );
    }

    if (interaction.customId === 'kaori-js:verify-image') {
      await interaction.deferReply({ ephemeral: true });

      const { image, text } = Captcha.create(
        { color: '#4b9d6e' },
        {} ,
        { amount: 5, blur: 25 },
        { rotate: 15, skew: true },
      );

      interaction.user
        .send({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                [
                  'Please send the green text displayed in the image below to this DM.',
                  '> ⚠️ If time passes or you make multiple mistakes, a new verification will need to be issued.',
                ].join('\n'),
              )
              .setColor(Colors.Blurple)
              .setImage('attachment://kaori-js-captcha.jpeg')
              .setFooter({
                text: 'Kaori never asks for password input or QR code scans.',
              }),
          ],
          files: [
            new AttachmentBuilder(image, { name: 'kaori-js-captcha.jpeg' }),
          ],
        })
        .then(() => {
          duringAuthentication.add(interaction.user.id);
          interaction.followUp(
            `${inlineCode('📨')} Continue the verification in DM.`,
          );

          if (!interaction.user.dmChannel) return;

          const collector = interaction.user.dmChannel.createMessageCollector({
            filter: (v) => v.author.id === interaction.user.id,
            time: Duration.toMS('1m'),
            max: 3,
          });

          collector.on('collect', (tryMessage) => {
            if (tryMessage.content !== text) return;

            roles
              .add(roleId, 'Verification')
              .then(() =>
                interaction.user.send(
                  `${inlineCode('✅')} Verification successful!`,
                ),
              )
              .catch(() =>
                interaction.user.send(
                  `${inlineCode(
                    '❌',
                  )} Failed to assign the role. Please contact a server admin.`,
                ),
              )
              .finally(() => collector.stop());
          });

          collector.on('end', (collection) => {
            if (collection.size === 3) {
              interaction.user.send(
                `${inlineCode(
                  '❌',
                )} You failed to verify after 3 attempts. You can try again in ${inlineCode(
                  '5 minutes',
                )}.`,
              );
              setTimeout(
                () => duringAuthentication.delete(interaction.user.id),
                Duration.toMS('5m'),
              );
            } else duringAuthentication.delete(interaction.user.id);
          });
        })
        .catch(() => {
          interaction.followUp({
            content: `${inlineCode(
              '❌',
            )} You must enable DM settings to receive messages from the bot.`,
            ephemeral: true,
          });
        });
    }
  },
);

export default [verifyCommand, verifyButton];
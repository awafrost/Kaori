import { ChatInput } from '@akki256/discord-interaction';
import axios from 'axios';
import {
  ApplicationCommandOptionType,
  Attachment,
  Colors,
  type Embed,
  EmbedBuilder,
  PermissionFlagsBits,
  Webhook,
  resolveColor,
} from 'discord.js';
import { embedMakerType, getEmbedMakerButtons } from './embed/_function';

const command = new ChatInput(
  {
    name: 'embed',
    description: 'Create an embed',
    options: [
      {
        name: 'create',
        description: 'Create a new embed',
        options: [
          {
            name: 'title',
            description: 'The title of the embed',
            maxLength: 256,
            type: ApplicationCommandOptionType.String,
          },
          {
            name: 'description',
            description: 'Description displayed in the embed (use two spaces for line breaks)',
            maxLength: 4096,
            type: ApplicationCommandOptionType.String,
          },
          {
            name: 'color',
            description: 'Color of the embed',
            type: ApplicationCommandOptionType.Number,
            choices: [
              { name: '🔴Red', value: Colors.Red },
              { name: '🟠Orange', value: Colors.Orange },
              { name: '🟡Yellow', value: Colors.Yellow },
              { name: '🟢Green', value: Colors.Green },
              { name: '🔵Blue', value: Colors.Blue },
              { name: '🟣Purple', value: Colors.Purple },
              { name: '⚪White', value: Colors.White },
              { name: '⚫Black', value: Colors.DarkButNotBlack },
            ],
          },
          {
            name: 'image',
            description: 'Image',
            type: ApplicationCommandOptionType.Attachment,
          },
        ],
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: 'import',
        description: 'Create an embed from a json file',
        options: [
          {
            name: 'json',
            description: 'json file',
            type: ApplicationCommandOptionType.Attachment,
            required: true,
          },
        ],
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: 'profile',
        description: 'Change the profile for sending embeds',
        options: [
          {
            name: 'name',
            description: 'Name',
            maxLength: 100,
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: 'avatar',
            description: 'Avatar',
            type: ApplicationCommandOptionType.Attachment,
          },
        ],
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
    dmPermission: false,
  },
  async (interaction) => {
    const subCommand = interaction.options.getSubcommand(true);

    if (!interaction.channel?.isTextBased())
      return interaction.reply({
        content: '`❌` This command cannot be used in this channel',
        ephemeral: true,
      });

    if (subCommand === 'create') {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color = interaction.options.getNumber('color');
      const attachment = interaction.options.getAttachment('image');

      if (!title && !description)
        return interaction.reply({
          content:
            '`❌` You must provide at least one of `title` or `description`.',
          ephemeral: true,
        });

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description?.replace('  ', '\n') || null)
        .setImage(attachment?.url || null)
        .setColor(color ?? Colors.White);

      interaction.reply({
        content:
          'You can change the sender\'s profile by using `/embed profile`.',
        embeds: [embed],
        components: getEmbedMakerButtons(embed.data, embedMakerType.send),
        ephemeral: true,
      });
    } else if (subCommand === 'import') {
      const attachment = interaction.options.getAttachment('json', true);

      console.log(attachment.contentType);

      if (!attachment.contentType?.startsWith('application/json'))
        return interaction.reply({
          content: '`❌` The attached file is not a json file.',
          ephemeral: true,
        });
      if (attachment.size > 3000000)
        return interaction.reply({
          content: '`❌` JSON files larger than 3MB cannot be imported.',
          ephemeral: true,
        });

      await interaction.deferReply({ ephemeral: true });
      let embeds = (await axios.get<Embed[] | Embed>(attachment.url)).data;
      if (!Array.isArray(embeds)) embeds = [embeds];

      interaction
        .followUp({
          content:
            'You can change the sender\'s profile by using `/embed profile`.',
          embeds: embeds,
          components: getEmbedMakerButtons(embeds[0], embedMakerType.send),
        })
        .catch(() =>
          interaction.followUp({
            content:
              '`❌` Import failed. Please check if the file is valid.',
            ephemeral: true,
          }),
        );
    } else if (subCommand === 'profile') {
      const name = interaction.options.getString('name', true);
      const avatar = interaction.options.getAttachment('avatar');

      if (!interaction.appPermissions?.has(PermissionFlagsBits.ManageWebhooks))
        return interaction.reply({
          content:
            '`❌` To use this feature, you must give Kaori the `Manage Webhooks` permission.',
          ephemeral: true,
        });
      if (
        avatar instanceof Attachment &&
        (!avatar.contentType ||
          !['image/png', 'image/jpeg'].includes(avatar.contentType))
      )
        return interaction.reply({
          content: '`❌` Only `jpeg` or `png` avatars are allowed.',
          ephemeral: true,
        });

      await interaction.deferReply({ ephemeral: true });

      const webhook = await interaction.guild
        ?.fetchWebhooks()
        .then((wh) =>
          wh.find((v) => v.owner?.id === interaction.client.user.id),
        )
        .catch(() => null);
      const res =
        webhook instanceof Webhook
          ? await webhook
              .edit({ name, avatar: avatar?.url || null })
              .catch(() => null)
          : await interaction.guild?.channels
              .createWebhook({
                name,
                avatar: avatar?.url || null,
                channel: interaction.channelId,
              })
              .catch(() => null);

      if (res instanceof Webhook)
        interaction.followUp({
          content: '`✅` Profile updated!',
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: res.name,
                iconURL:
                  res.avatarURL() ?? interaction.client.rest.cdn.defaultAvatar(0),
              })
              .setColor(resolveColor('#2b2d31')),
          ],
          ephemeral: true,
        });
      else
        interaction.followUp({
          content: '`❌` Failed to update profile.',
          ephemeral: true,
        });
    }
  },
);

module.exports = [command];
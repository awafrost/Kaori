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
    description: 'Créer un embed',
    options: [
      {
        name: 'create',
        description: 'Créer un nouvel embed',
        options: [
          {
            name: 'title',
            description: 'Le titre de l’embed',
            maxLength: 256,
            type: ApplicationCommandOptionType.String,
          },
          {
            name: 'description',
            description: 'Description affichée dans l’embed (utilisez deux espaces pour un saut de ligne)',
            maxLength: 4096,
            type: ApplicationCommandOptionType.String,
          },
          {
            name: 'color',
            description: 'Couleur de l’embed',
            type: ApplicationCommandOptionType.Number,
            choices: [
              { name: '🔴Rouge', value: Colors.Red },
              { name: '🟠Orange', value: Colors.Orange },
              { name: '🟡Jaune', value: Colors.Yellow },
              { name: '🟢Vert', value: Colors.Green },
              { name: '🔵Bleu', value: Colors.Blue },
              { name: '🟣Violet', value: Colors.Purple },
              { name: '⚪Blanc', value: Colors.White },
              { name: '⚫Noir', value: Colors.DarkButNotBlack },
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
        description: 'Créer un embed à partir d’un fichier JSON',
        options: [
          {
            name: 'json',
            description: 'Fichier JSON',
            type: ApplicationCommandOptionType.Attachment,
            required: true,
          },
        ],
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: 'profile',
        description: 'Modifier le profil pour l’envoi des embeds',
        options: [
          {
            name: 'name',
            description: 'Nom',
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
        content: '`❌` Cette commande ne peut pas être utilisée dans ce salon.',
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
            '`❌` Vous devez fournir au moins un `titre` ou une `description`.',
          ephemeral: true,
        });

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description?.replace('  ', '\n') || null)
        .setImage(attachment?.url || null)
        .setColor(color ?? Colors.White);

      interaction.reply({
        content:
          'Vous pouvez changer le profil de l’expéditeur en utilisant `/embed profile`.',
        embeds: [embed],
        components: getEmbedMakerButtons(embed.data, embedMakerType.send),
        ephemeral: true,
      });
    } else if (subCommand === 'import') {
      const attachment = interaction.options.getAttachment('json', true);

      console.log(attachment.contentType);

      if (!attachment.contentType?.startsWith('application/json'))
        return interaction.reply({
          content: '`❌` Le fichier joint n’est pas un fichier JSON.',
          ephemeral: true,
        });
      if (attachment.size > 3000000)
        return interaction.reply({
          content: '`❌` Les fichiers JSON de plus de 3 Mo ne peuvent pas être importés.',
          ephemeral: true,
        });

      await interaction.deferReply({ ephemeral: true });
      let embeds = (await axios.get<Embed[] | Embed>(attachment.url)).data;
      if (!Array.isArray(embeds)) embeds = [embeds];

      interaction
        .followUp({
          content:
            'Vous pouvez changer le profil de l’expéditeur en utilisant `/embed profile`.',
          embeds: embeds,
          components: getEmbedMakerButtons(embeds[0], embedMakerType.send),
        })
        .catch(() =>
          interaction.followUp({
            content:
              '`❌` Échec de l’importation. Veuillez vérifier si le fichier est valide.',
            ephemeral: true,
          }),
        );
    } else if (subCommand === 'profile') {
      const name = interaction.options.getString('name', true);
      const avatar = interaction.options.getAttachment('avatar');

      if (!interaction.appPermissions?.has(PermissionFlagsBits.ManageWebhooks))
        return interaction.reply({
          content:
            '`❌` Pour utiliser cette fonctionnalité, vous devez donner à Kaori la permission `Gérer les webhooks`.',
          ephemeral: true,
        });
      if (
        avatar instanceof Attachment &&
        (!avatar.contentType ||
          !['image/png', 'image/jpeg'].includes(avatar.contentType))
      )
        return interaction.reply({
          content: '`❌` Seuls les avatars au format `jpeg` ou `png` sont autorisés.',
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
          content: '`✅` Profil mis à jour !',
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
          content: '`❌` Échec de la mise à jour du profil.',
          ephemeral: true,
        });
    }
  },
);

module.exports = [command];
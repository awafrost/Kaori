import { ChatInput } from '@akki256/discord-interaction';
import { permissionField } from '@modules/fields';
import { Duration } from '@modules/format';
import { permToText } from '@modules/util';
import {
  ApplicationCommandOptionType,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  codeBlock,
  inlineCode,
} from 'discord.js';

export default new ChatInput(
  {
    name: 'clear',
    description: 'Supprimer en masse des messages avec des fonctionnalités avancées',
    options: [
      {
        name: 'count',
        description: 'Nombre de messages à supprimer',
        type: ApplicationCommandOptionType.Integer,
        minValue: 1,
        maxValue: 1000, // Déjà à 1000 dans le code original
        required: true,
      },
      {
        name: 'from',
        description: 'Supprimer les messages de (membre/bot/tous)',
        type: ApplicationCommandOptionType.String,
        choices: [
          { name: 'Membre', value: 'member' },
          { name: 'Bot', value: 'bot' },
          { name: 'Tous', value: 'all' },
        ],
      },
      {
        name: 'user',
        description: 'Utilisateur dont filtrer les messages (si "from" est "membre")',
        type: ApplicationCommandOptionType.User,
      },
      {
        name: 'type',
        description: 'Type de contenu à supprimer',
        type: ApplicationCommandOptionType.String,
        choices: [
          { name: 'Tous', value: 'all' },
          { name: 'Images', value: 'image' },
          { name: 'Vidéos', value: 'video' },
          { name: 'Embeds', value: 'embed' },
          { name: 'Texte uniquement', value: 'text' },
        ],
      },
    ],
    dmPermission: false,
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
  },
  { coolTime: Duration.toMS('10s') },
  async (interaction) => {
    if (!(interaction.inGuild() && interaction.channel)) return;
    if (!interaction.appPermissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: permissionField(permToText('ManageMessages'), {
          label: 'Le bot manque des permissions nécessaires',
        }),
        ephemeral: true,
      });
    }
    
    const bulkCount = interaction.options.getInteger('count', true);
    const from = interaction.options.getString('from') || 'all';
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type') || 'all';

    try {
      // Fetch plus de messages pour avoir assez après filtrage
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      let messagesToDelete = messages;

      // Filtrer d'abord par auteur
      if (from === 'member') {
        if (!user) {
          return interaction.reply({
            content: `${inlineCode('❌')} Vous devez spécifier un utilisateur lorsque vous choisissez de supprimer les messages d’un membre.`,
            ephemeral: true,
          });
        }
        messagesToDelete = messages.filter(msg => msg.author.id === user.id);
      } else if (from === 'bot') {
        messagesToDelete = messages.filter(msg => msg.author.bot);
      }

      // Appliquer le filtre de type de contenu
      if (type !== 'all') {
        switch (type) {
          case 'image':
            messagesToDelete = messagesToDelete.filter(msg => 
              msg.attachments.size > 0 && 
              msg.attachments.some(a => a.contentType && a.contentType.startsWith('image/'))
            );
            break;
          case 'video':
            messagesToDelete = messagesToDelete.filter(msg => 
              msg.attachments.size > 0 && 
              msg.attachments.some(a => a.contentType && a.contentType.startsWith('video/'))
            );
            break;
          case 'embed':
            messagesToDelete = messagesToDelete.filter(msg => msg.embeds.length > 0);
            break;
          case 'text':
            messagesToDelete = messagesToDelete.filter(msg => 
              msg.content && 
              !msg.attachments.size && 
              msg.embeds.length === 0
            );
            break;
        }
      }

      // Limiter au nombre demandé
      const finalMessages = Array.from(messagesToDelete.values()).slice(0, bulkCount);
      
      if (finalMessages.length === 0) {
        return interaction.reply({
          content: `${inlineCode('❌')} Aucun message correspondant aux critères n’a été trouvé.`,
          ephemeral: true,
        });
      }

      const deleted = await interaction.channel.bulkDelete(finalMessages, true);
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${inlineCode('✅')} ${inlineCode(`${deleted.size} messages`)} supprimés avec succès.`
            )
            .setColor(Colors.Green),
        ],
        ephemeral: true,
      });
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : String(err);
      
      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              [
                `${inlineCode('❌')} Échec de la suppression des messages.`,
                codeBlock(errorMessage),
              ].join('\n'),
            )
            .setColor(Colors.Red),
        ],
        ephemeral: true,
      });
    }
  },
);
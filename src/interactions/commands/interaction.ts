import { ChatInput } from '@akki256/discord-interaction';
import { ApplicationCommandOptionType, EmbedBuilder, Colors } from 'discord.js';
import fetch from 'node-fetch';

// Définissons une interface pour la structure de la réponse de l'API Jikan
interface JikanResponse {
  data: Anime[];
}

// Définissons une interface pour la structure d'un anime
interface Anime {
  title: string;
  synopsis?: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
  episodes?: number;
  score?: number;
  status?: string;
  genres: Genre[];
}

// Définissons une interface pour la structure des données de genre
interface Genre {
  name: string;
}

export default new ChatInput(
  {
    name: 'anime',
    description: 'Recherchez des informations sur un anime spécifique',
    options: [
      {
        name: 'nom',
        description: 'Le nom de l\'anime à rechercher',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
    defaultMemberPermissions: null,
    dmPermission: true,
  },
  async (interaction) => {
    const animeName = interaction.options.getString('nom', true);

    try {
      // Encodage de l'anime name pour l'URL
      const encodedAnimeName = encodeURIComponent(animeName);
      // Appel à l'API Jikan pour rechercher l'anime
      const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodedAnimeName}&limit=1`);
      const data = await response.json() as JikanResponse;

      if (!data || !data.data || data.data.length === 0) {
        return interaction.reply({
          content: `Désolé, je n'ai trouvé aucun anime correspondant à "${animeName}".`,
          ephemeral: true,
        });
      }

      // Prend le premier résultat de la recherche
      const anime = data.data[0];

      // Construit et envoie l'embed avec les informations de l'anime
      const embed = new EmbedBuilder()
        .setTitle(anime.title)
        .setColor(Colors.Blue)
        .setDescription(anime.synopsis ? anime.synopsis.substring(0, 2000) : 'Pas de synopsis disponible.')
        .setThumbnail(anime.images.jpg.image_url)
        .addFields(
          { name: 'Épisodes', value: anime.episodes?.toString() || 'Inconnu', inline: true },
          { name: 'Score', value: anime.score?.toString() || 'Inconnu', inline: true },
          { name: 'Statut', value: anime.status || 'Inconnu', inline: true },
          { 
            name: 'Genres', 
            value: anime.genres.map((genre: Genre) => genre.name).join(', ') || 'Inconnu' 
          },
        )
        .setFooter({ text: 'Powered by Jikan API' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(`Erreur lors de la recherche de l'anime ${animeName}:`, error);
      await interaction.reply({
        content: 'Une erreur est survenue lors de la recherche de l\'anime.',
        ephemeral: true,
      });
    }
  },
);
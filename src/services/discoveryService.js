import { getRelatedArtists, getArtistTopAlbums } from './spotifyService.js';
import { getSimilarArtistsFromLastfm, getArtistTopAlbumsFromLastfm } from './lastfmService.js';
import * as cacheService from './cacheService.js';

// Cache TTL for discovery data: 12 hours (43200 seconds)
const DISCOVERY_CACHE_TTL = 12 * 60 * 60;

// Use Last.fm as primary source for similar artists (Spotify recommendations deprecated)
const USE_LASTFM = true;

/**
 * Generates album/disc recommendations based on user's listening preferences
 * Returns 30 albums sorted by similarity to what the user currently listens to
 * Includes albums from both artists the user knows and similar new artists
 */
export const generateDiscoveryRecommendations = async (analysisData) => {
  const cacheKey = cacheService.generateKey('discovery_recommendations', 'discovery');

  // Try to get from cache
  const cachedData = cacheService.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const { topArtists, topAlbums } = analysisData;

  // Get albums the user already has in their top albums to avoid duplicates
  const userAlbumNames = new Set(topAlbums.map(album => album.name.toLowerCase()));

  const albumRecommendations = [];

  // Step 1: Get similar artists using Last.fm
  let similarArtists = [];
  if (USE_LASTFM) {
    try {
      console.log(`💿 Using Last.fm to find similar artists for album discovery...`);
      similarArtists = await getSimilarArtistsFromLastfm(topArtists);
    } catch (error) {
      console.error('Error fetching from Last.fm, falling back to Spotify:', error.message);
      const userArtistIds = new Set(topArtists.map(artist => artist.id));
      const userArtistNames = new Set(topArtists.map(artist => artist.name.toLowerCase()));
      similarArtists = await getDiscoveryFromSpotify(topArtists, userArtistIds, userArtistNames);
    }
  }

  // Step 2: Get albums from both user's top artists and similar artists
  // Total: 8 user artists + 12 similar = 20 artists (optimized for performance)
  const artistsToExplore = [
    // User's top artists with high relevance (reduced to 8 for performance)
    ...topArtists.slice(0, 8).map(artist => ({
      ...artist,
      relevanceScore: 10, // High base score for user's own artists
      similarToArtists: ['Tus artistas favoritos'],
      similarity: 1.0,
      isUserArtist: true
    })),
    // Similar artists (12 from Last.fm)
    ...similarArtists.map(artist => ({
      ...artist,
      isUserArtist: false
    }))
  ];

  console.log(`💿 Exploring ${artistsToExplore.length} artists for album recommendations...`);

  // OPTIMIZATION: Fetch albums for all artists in parallel instead of sequentially
  const albumPromises = artistsToExplore.map(async (artist) => {
    try {
      console.log(`  Fetching albums for: ${artist.name} (relevance: ${artist.relevanceScore})`);

      // Get 2-3 albums from each artist (reduced from 4 for speed)
      let albums = [];
      try {
        if (artist.id) {
          // Use Spotify ID if available
          albums = await getArtistTopAlbums(artist.id, 3);
        } else {
          // Fallback to Last.fm
          albums = await getArtistTopAlbumsFromLastfm(artist.name, 3);
        }
      } catch (error) {
        console.log(`Could not fetch albums for ${artist.name}:`, error.message);
        return [];
      }

      console.log(`  Found ${albums?.length || 0} albums for ${artist.name}`);

      if (!albums || albums.length === 0) {
        return [];
      }

      // Process albums and return recommendations for this artist
      return albums
        .filter(album => {
          // Skip if already in user's top albums
          if (userAlbumNames.has(album.name.toLowerCase())) {
            console.log(`  ⏭️  Skipping already listened album: ${album.name}`);
            return false;
          }
          return true;
        })
        .map(album => {
          // Calculate album relevance score
          const baseScore = artist.relevanceScore || 1;
          const similarityBonus = (artist.similarity || 0) * 5;
          const popularityBonus = (album.total_tracks || 10) / 100;

          const albumRelevanceScore = baseScore + similarityBonus + popularityBonus;

          return {
            albumId: album.id || null,
            albumName: album.name,
            artist: artist.name,
            artistId: artist.id || artist.artistId || null,
            releaseDate: album.release_date || null,
            coverImage: album.images?.[0]?.url || album.image || artist.image || null,
            spotifyUri: album.uri || null,
            reason: artist.isUserArtist
              ? `Más discos de ${artist.name}, uno de tus artistas favoritos`
              : `Similar a ${artist.similarToArtists?.slice(0, 2).join(', ') || 'tus gustos'}`,
            genres: artist.genres || artist.tags || [],
            popularity: Math.round((artist.similarity || 0) * 100),
            relevanceScore: albumRelevanceScore,
            similarToArtists: artist.similarToArtists || [],
            isFromUserArtist: artist.isUserArtist || false,
            discovery: true,
            type: 'album_discovery',
            source: artist.id ? 'spotify' : 'lastfm',
            totalTracks: album.total_tracks || album.trackCount || null
          };
        });
    } catch (error) {
      console.error(`Error fetching albums for ${artist.name}:`, error.message);
      return [];
    }
  });

  // Wait for all album fetches to complete (in parallel)
  console.log(`⚡ Fetching albums for ${albumPromises.length} artists in parallel...`);
  const startTime = Date.now();
  const albumResults = await Promise.allSettled(albumPromises);
  const endTime = Date.now();
  console.log(`⚡ Fetched all albums in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

  // Flatten results and filter out failed promises
  albumResults.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      albumRecommendations.push(...result.value);
    }
  });

  // Step 3: Sort by relevance score and take top 30
  const sortedRecommendations = albumRecommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 30);

  console.log(`💿 Generated ${sortedRecommendations.length} album recommendations (sorted by relevance)`);

  // Add rank
  const rankedRecommendations = sortedRecommendations.map((rec, index) => ({
    rank: index + 1,
    ...rec,
    vinylSearchTip: `Busca "${rec.artist} - ${rec.albumName}" en vinilo`
  }));

  // Cache the recommendations
  cacheService.set(cacheKey, rankedRecommendations, DISCOVERY_CACHE_TTL);
  return rankedRecommendations;
};

/**
 * Fallback: Get discovery recommendations using Spotify's related artists
 */
const getDiscoveryFromSpotify = async (topArtists, userArtistIds, userArtistNames) => {
  const discoveryMap = new Map();
  const seedArtists = topArtists.slice(0, 10);

  console.log(`🔍 Fallback: Finding similar artists based on ${seedArtists.length} seed artists from Spotify...`);

  for (const seedArtist of seedArtists) {
    try {
      console.log(`  Fetching related artists for: ${seedArtist.name}`);
      const relatedArtists = await getRelatedArtists(seedArtist.id);

      for (const relatedArtist of relatedArtists) {
        if (userArtistIds.has(relatedArtist.id) || userArtistNames.has(relatedArtist.name.toLowerCase())) {
          continue;
        }

        if (discoveryMap.has(relatedArtist.id)) {
          const existing = discoveryMap.get(relatedArtist.id);
          existing.similarToArtists.push(seedArtist.name);
          existing.relevanceScore += 1;
          continue;
        }

        const genreOverlap = (relatedArtist.genres && seedArtist.genres)
          ? relatedArtist.genres.filter(genre =>
              seedArtist.genres.some(userGenre =>
                userGenre.includes(genre) || genre.includes(userGenre)
              )
            ).length
          : 0;

        const relevanceScore = 1 + genreOverlap * 0.5;

        discoveryMap.set(relatedArtist.id, {
          id: relatedArtist.id,
          name: relatedArtist.name,
          genres: relatedArtist.genres,
          images: relatedArtist.images,
          popularity: relatedArtist.popularity,
          similarToArtists: [seedArtist.name],
          relevanceScore: relevanceScore,
          genreOverlap: genreOverlap,
          similarity: relatedArtist.popularity / 100
        });
      }
    } catch (error) {
      console.error(`Error fetching related artists for ${seedArtist.name}:`, error.message);
    }
  }

  return Array.from(discoveryMap.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 15);
};

/**
 * Generates a summary of album/disc discovery recommendations
 */
export const generateDiscoverySummary = (recommendations) => {
  const cacheKey = cacheService.generateKey('discovery_summary', 'discovery');

  // Try to get from cache
  const cachedData = cacheService.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // Extract unique genres from recommendations
  const genreCount = {};
  recommendations.forEach(rec => {
    if (rec.genres) {
      rec.genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    }
  });

  // Get top genres
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  // Get unique artists (both user's and new)
  const uniqueArtists = [...new Set(recommendations.map(r => r.artist))];

  // Count albums from user's artists vs new artists
  const albumsFromUserArtists = recommendations.filter(r => r.isFromUserArtist).length;
  const albumsFromNewArtists = recommendations.length - albumsFromUserArtists;

  const result = {
    totalDiscs: recommendations.length,
    totalArtists: uniqueArtists.length,
    discsFromFavoriteArtists: albumsFromUserArtists,
    discsFromNewArtists: albumsFromNewArtists,
    topGenres: topGenres,
    averageRelevance: Math.round(
      recommendations.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / recommendations.length
    )
  };

  // Cache the summary
  cacheService.set(cacheKey, result, DISCOVERY_CACHE_TTL);
  return result;
};

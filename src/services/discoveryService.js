import { getRelatedArtists, getArtistTopAlbums } from './spotifyService.js';
import { getSimilarArtistsFromLastfm, getArtistTopAlbumsFromLastfm } from './lastfmService.js';
import * as cacheService from './cacheService.js';

// Cache TTL for discovery data: 12 hours (43200 seconds)
const DISCOVERY_CACHE_TTL = 12 * 60 * 60;

// Use Last.fm as primary source for similar artists (Spotify recommendations deprecated)
const USE_LASTFM = true;

/**
 * Generates vinyl recommendations from similar artists that the user doesn't already listen to
 * This helps users discover new music in their preferred genres
 * Uses Last.fm API for finding similar artists since Spotify recommendations are deprecated
 */
export const generateDiscoveryRecommendations = async (analysisData) => {
  const cacheKey = cacheService.generateKey('discovery_recommendations', 'discovery');
  
  // Try to get from cache
  const cachedData = cacheService.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const { topArtists } = analysisData;

  // Get IDs of artists the user already listens to
  const userArtistIds = new Set(topArtists.map(artist => artist.id));
  const userArtistNames = new Set(topArtists.map(artist => artist.name.toLowerCase()));

  const discoveryMap = new Map();

  let similarArtists = [];

  // Use Last.fm for finding similar artists (better support after Spotify deprecated recommendations)
  if (USE_LASTFM) {
    try {
      console.log(`🎵 Using Last.fm to find similar artists...`);
      similarArtists = await getSimilarArtistsFromLastfm(topArtists);
    } catch (error) {
      console.error('Error fetching from Last.fm, falling back to Spotify:', error.message);
      // Fallback to Spotify if Last.fm fails
      similarArtists = await getDiscoveryFromSpotify(topArtists, userArtistIds, userArtistNames);
    }
  } else {
    // Fallback: use Spotify's related artists
    similarArtists = await getDiscoveryFromSpotify(topArtists, userArtistIds, userArtistNames);
  }

  // Map Last.fm results to our discovery structure
  const recommendations = [];

  for (const artist of similarArtists) {
    try {
      console.log(`  Fetching albums for: ${artist.name}`);
      
      // Try to get albums from Spotify first, fallback to Last.fm
      let albums = [];
      try {
        // Try to find the artist in Spotify for better data
        const spotifyArtists = await spotifySearch(`artist:${artist.name}`, 'artist');
        if (spotifyArtists && spotifyArtists.length > 0) {
          albums = await getArtistTopAlbums(spotifyArtists[0].id, 2);
        }
      } catch (error) {
        console.log(`Could not fetch from Spotify, trying Last.fm for ${artist.name}`);
        // Fallback to Last.fm
        albums = await getArtistTopAlbumsFromLastfm(artist.name, 2);
      }

      console.log(`  Found ${albums?.length || 0} albums`);

      if (albums && albums.length > 0) {
        for (const album of albums) {
          recommendations.push({
            albumId: album.id || null,
            albumName: album.name,
            artist: artist.name,
            artistId: artist.id || null,
            releaseDate: album.release_date || null,
            coverImage: album.images?.[0]?.url || album.image || artist.image || null,
            spotifyUri: album.uri || null,
            reason: `Similar to ${artist.similarToArtists.join(', ')}`,
            genres: artist.tags || [],
            popularity: Math.round((artist.similarity || 0) * 100),
            relevanceScore: artist.relevanceScore || 0,
            similarToArtists: artist.similarToArtists || [],
            discovery: true,
            type: 'discovery',
            source: 'lastfm'
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching albums for ${artist.name}:`, error.message);
    }
  }

  console.log(`🎵 Generated ${recommendations.length} discovery recommendations`);

  // Add rank
  const rankedRecommendations = recommendations.map((rec, index) => ({
    rank: index + 1,
    ...rec,
    vinylSearchTip: `Search "${rec.artist} ${rec.albumName}" to discover new music similar to your favorites`
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
 * Generates a summary of discovery recommendations
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

  // Get unique new artists
  const uniqueArtists = [...new Set(recommendations.map(r => r.artist))];

  const result = {
    totalNewArtists: uniqueArtists.length,
    totalAlbums: recommendations.length,
    topGenres: topGenres,
    averagePopularity: Math.round(
      recommendations.reduce((sum, r) => sum + (r.popularity || 0), 0) / recommendations.length
    )
  };
  
  // Cache the summary
  cacheService.set(cacheKey, result, DISCOVERY_CACHE_TTL);
  return result;
};

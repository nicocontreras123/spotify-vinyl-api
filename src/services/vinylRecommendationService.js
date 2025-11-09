import { getArtistTopAlbums } from './spotifyService.js';
import { searchVinylPrice } from './discogsService.js';
import { getUserAlbumStatus } from './userVinylService.js';

/**
 * Analyzes user's Spotify listening data and recommends vinyl records to purchase
 * Note: Singles (albums with only 1 track) are filtered out as they rarely have vinyl versions
 * @param {Object} analysisData - User's Spotify listening data
 * @param {number|null} userId - Optional user ID for personalized filtering (owned/favorites)
 * NOTE: Caching is now handled in the controller, not here
 */
export const generateVinylRecommendations = async (analysisData, userId = null) => {
  const { topTracks, topArtists, topAlbums } = analysisData;

  console.log(`🎵 Generating vinyl recommendations from ${topAlbums.length} albums and ${topArtists.length} artists`);

  // Get user's owned and favorite albums if logged in
  let ownedAlbums = new Set();
  let favoriteAlbums = new Set();
  let ownedAlbumNames = new Set();
  let favoriteAlbumNames = new Set();

  if (userId) {
    try {
      const userAlbumStatus = await getUserAlbumStatus(userId);
      ownedAlbums = userAlbumStatus.owned;
      favoriteAlbums = userAlbumStatus.favorites;
      ownedAlbumNames = userAlbumStatus.ownedNames;
      favoriteAlbumNames = userAlbumStatus.favoriteNames;
      console.log(`👤 User has ${ownedAlbums.size} owned albums and ${favoriteAlbums.size} favorites`);
    } catch (error) {
      console.error('Error getting user album status:', error);
      // Continue without filtering if error
    }
  }

  const recommendations = [];
  const addedAlbumIds = new Set();

  // Helper function to calculate a score for an album
  const calculateScore = (album, artistName, genres = []) => {
    let score = 0;

    // Check if artist is in top artists
    const artistRank = topArtists.findIndex(a => a.name === artistName);
    if (artistRank !== -1) {
      score += (50 - artistRank); // Higher score for top-ranked artists
    }

    // Check genre match
    const artistGenres = topArtists.find(a => a.name === artistName)?.genres || genres;
    const genreMatches = artistGenres.filter(genre =>
      topArtists.some(artist => artist.genres.includes(genre))
    ).length;
    score += genreMatches * 5;

    // BONUS: If album is in user's favorites, give significant boost
    if (favoriteAlbums.has(album.id)) {
      score += 1000; // High priority for favorites
    }

    return score;
  };

  // 1. Recommend albums from top artists (prioritize full albums)
  const artistAlbumMap = new Map();

  topAlbums.forEach(album => {
    // Create name-based lookup key
    const albumKey = `${album.name.toLowerCase()}|${album.artist.toLowerCase()}`;

    // Skip albums the user already owns (by ID or name)
    if (album.id && ownedAlbums.has(album.id)) {
      console.log(`⏭️ Skipping owned album (by ID): ${album.artist} - ${album.name}`);
      return;
    }
    if (ownedAlbumNames.has(albumKey)) {
      console.log(`⏭️ Skipping owned album (by name): ${album.artist} - ${album.name}`);
      return;
    }

    if (!addedAlbumIds.has(album.id)) {
      const score = calculateScore(album, album.artist);
      artistAlbumMap.set(album.id, {
        ...album,
        score,
        reason: 'Album featuring your top tracks'
      });
    }
  });

  // Sort by score and add top albums
  const sortedAlbums = Array.from(artistAlbumMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  sortedAlbums.forEach(album => {
    recommendations.push({
      albumId: album.id,
      albumName: album.name,
      artist: album.artist,
      releaseDate: album.releaseDate,
      spotifyUri: album.uri,
      coverImage: album.images[0]?.url,
      reason: album.reason,
      priority: 'high'
    });
    addedAlbumIds.add(album.id);
  });

  // 2. Add recommendations based on top artists' albums
  const artistsToFetch = topArtists
    .slice(0, 8)
    .filter(artist => !recommendations.some(r => r.artist === artist.name));

  // Fetch albums for these artists
  const artistAlbumsPromises = artistsToFetch.map(async (artist) => {
    try {
      const albums = await getArtistTopAlbums(artist.id, 1);
      if (albums && albums.length > 0) {
        const album = albums[0];

        // Create name-based lookup key
        const albumKey = `${album.name.toLowerCase()}|${artist.name.toLowerCase()}`;

        // Skip if user already owns this album (by ID or name)
        if (album.id && ownedAlbums.has(album.id)) {
          console.log(`⏭️ Skipping owned album (by ID): ${artist.name} - ${album.name}`);
          return null;
        }
        if (ownedAlbumNames.has(albumKey)) {
          console.log(`⏭️ Skipping owned album (by name): ${artist.name} - ${album.name}`);
          return null;
        }

        return {
          albumId: album.id,
          albumName: album.name,
          artist: artist.name,
          releaseDate: album.release_date,
          spotifyUri: album.uri,
          coverImage: album.images[0]?.url || artist.images[0]?.url,
          reason: `You listen to ${artist.name} frequently`,
          priority: 'medium'
        };
      }
    } catch (error) {
      console.log(`Could not fetch albums for ${artist.name}`);
      // Skip recommendation if we can't get a valid album ID
      return null;
    }
  });

  const topArtistRecommendations = await Promise.all(artistAlbumsPromises);
  recommendations.push(...topArtistRecommendations.filter(Boolean));

  console.log(`✅ Total recommendations before limit: ${recommendations.length}`);

  // 3. Ensure we have exactly 20 recommendations
  const finalRecommendations = recommendations.slice(0, 20);

  console.log(`📀 Final vinyl recommendations: ${finalRecommendations.length}`);

  // Add ranking
  const recommendationsWithRank = finalRecommendations.map((rec, index) => ({
    rank: index + 1,
    ...rec,
    vinylSearchTip: `Search "${rec.artist} ${rec.albumName}" on Discogs or your local record store`
  }));

  // 4. Fetch prices for top 5 recommendations (high priority ones)
  // Process sequentially to avoid rate limiting
  const topRecommendations = recommendationsWithRank.slice(0, 5);
  const remaining = recommendationsWithRank.slice(5);

  const recommendationsWithPrices = [];

  for (const rec of topRecommendations) {
    try {
      const priceInfo = await searchVinylPrice(rec.artist, rec.albumName);
      recommendationsWithPrices.push({
        ...rec,
        priceInfo
      });
    } catch (error) {
      console.error(`Error fetching price for ${rec.artist} - ${rec.albumName}:`, error.message);
      // Add without price info if error
      recommendationsWithPrices.push(rec);
    }
  }

  return [...recommendationsWithPrices, ...remaining];
};

/**
 * Generates a summary of the user's music taste
 * NOTE: Caching is now handled in the controller, not here
 */
export const generateMusicTasteSummary = (analysisData) => {
  const { topArtists } = analysisData;

  // Extract all genres
  const genreCount = {};
  topArtists.forEach(artist => {
    artist.genres.forEach(genre => {
      genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
  });

  // Sort genres by frequency
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  const result = {
    topGenres,
    topArtistNames: topArtists.slice(0, 10).map(a => a.name),
    musicProfile: {
      diversityScore: Object.keys(genreCount).length,
      mainGenre: topGenres[0]?.genre || 'Various',
      totalArtistsAnalyzed: topArtists.length
    }
  };

  return result;
};

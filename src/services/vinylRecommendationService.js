import { getArtistTopAlbums } from './spotifyService.js';
import { searchVinylPrice } from './discogsService.js';

/**
 * Analyzes user's Spotify listening data and recommends vinyl records to purchase
 */
export const generateVinylRecommendations = async (analysisData) => {
  const { topTracks, topArtists, topAlbums } = analysisData;

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

    return score;
  };

  // 1. Recommend albums from top artists (prioritize full albums)
  const artistAlbumMap = new Map();

  topAlbums.forEach(album => {
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
        return {
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
      // Fallback to artist image
      return {
        albumName: `Popular Album by ${artist.name}`,
        artist: artist.name,
        coverImage: artist.images[0]?.url,
        reason: `You listen to ${artist.name} frequently`,
        priority: 'medium',
        note: 'Search for this artist\'s most acclaimed albums on vinyl'
      };
    }
  });

  const topArtistRecommendations = await Promise.all(artistAlbumsPromises);
  recommendations.push(...topArtistRecommendations.filter(Boolean));

  // 3. Ensure we have exactly 20 recommendations
  const finalRecommendations = recommendations.slice(0, 20);

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

  return {
    topGenres,
    topArtistNames: topArtists.slice(0, 10).map(a => a.name),
    musicProfile: {
      diversityScore: Object.keys(genreCount).length,
      mainGenre: topGenres[0]?.genre || 'Various',
      totalArtistsAnalyzed: topArtists.length
    }
  };
};

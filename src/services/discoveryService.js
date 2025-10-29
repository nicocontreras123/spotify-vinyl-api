import { getRelatedArtists, getArtistTopAlbums } from './spotifyService.js';

/**
 * Generates vinyl recommendations from similar artists that the user doesn't already listen to
 * This helps users discover new music in their preferred genres
 */
export const generateDiscoveryRecommendations = async (analysisData) => {
  const { topArtists } = analysisData;

  // Get IDs of artists the user already listens to
  const userArtistIds = new Set(topArtists.map(artist => artist.id));
  const userArtistNames = new Set(topArtists.map(artist => artist.name.toLowerCase()));

  const discoveryMap = new Map();
  const artistSimilarityScore = new Map();

  // Use top 10 artists as seeds for discovery
  const seedArtists = topArtists.slice(0, 10);

  console.log(`🔍 Finding similar artists based on ${seedArtists.length} seed artists...`);

  // For each seed artist, find related artists
  for (const seedArtist of seedArtists) {
    try {
      console.log(`  Fetching related artists for: ${seedArtist.name}`);
      const relatedArtists = await getRelatedArtists(seedArtist.id);
      console.log(`  Found ${relatedArtists.length} related artists`);

      for (const relatedArtist of relatedArtists) {
        // Skip if user already listens to this artist
        if (userArtistIds.has(relatedArtist.id) ||
            userArtistNames.has(relatedArtist.name.toLowerCase())) {
          continue;
        }

        // Skip if already processed
        if (discoveryMap.has(relatedArtist.id)) {
          // Increment similarity score if found from multiple seed artists
          const existing = discoveryMap.get(relatedArtist.id);
          existing.similarToArtists.push(seedArtist.name);
          existing.relevanceScore += 1;
          continue;
        }

        // Check genre overlap
        const genreOverlap = (relatedArtist.genres && seedArtist.genres)
          ? relatedArtist.genres.filter(genre =>
              seedArtist.genres.some(userGenre =>
                userGenre.includes(genre) || genre.includes(userGenre)
              )
            ).length
          : 0;

        // Calculate relevance score
        const relevanceScore = 1 + genreOverlap * 0.5;

        discoveryMap.set(relatedArtist.id, {
          id: relatedArtist.id,
          name: relatedArtist.name,
          genres: relatedArtist.genres,
          images: relatedArtist.images,
          popularity: relatedArtist.popularity,
          similarToArtists: [seedArtist.name],
          relevanceScore: relevanceScore,
          genreOverlap: genreOverlap
        });
      }
    } catch (error) {
      console.error(`Error fetching related artists for ${seedArtist.name}:`, error.message);
    }
  }

  console.log(`✅ Found ${discoveryMap.size} new artists to explore`);

  // Sort by relevance and popularity
  const sortedArtists = Array.from(discoveryMap.values())
    .sort((a, b) => {
      // Primary sort by relevance score (how many connections)
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Secondary sort by popularity
      return b.popularity - a.popularity;
    })
    .slice(0, 15); // Top 15 new artists

  console.log(`🎯 Selected top ${sortedArtists.length} artists for album recommendations`);

  // Get top albums for each discovered artist
  const recommendations = [];

  for (const artist of sortedArtists) {
    try {
      console.log(`  Fetching albums for: ${artist.name}`);
      const albums = await getArtistTopAlbums(artist.id, 2); // Get 2 best albums per artist
      console.log(`  Found ${albums?.length || 0} albums`);

      if (albums && albums.length > 0) {
        for (const album of albums) {
          // Build explanation of why this is recommended
          const similarArtistsText = artist.similarToArtists.length > 1
            ? `${artist.similarToArtists[0]} and ${artist.similarToArtists.length - 1} other artists you listen to`
            : artist.similarToArtists[0];

          recommendations.push({
            albumId: album.id,
            albumName: album.name,
            artist: artist.name,
            artistId: artist.id,
            releaseDate: album.release_date,
            coverImage: album.images[0]?.url || artist.images[0]?.url,
            spotifyUri: album.uri,
            reason: `Similar to ${similarArtistsText}`,
            genres: artist.genres.slice(0, 3),
            popularity: artist.popularity,
            relevanceScore: artist.relevanceScore,
            similarToArtists: artist.similarToArtists,
            discovery: true, // Flag to indicate this is a discovery recommendation
            type: 'discovery'
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

  return rankedRecommendations;
};

/**
 * Generates a summary of discovery recommendations
 */
export const generateDiscoverySummary = (recommendations) => {
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

  return {
    totalNewArtists: uniqueArtists.length,
    totalAlbums: recommendations.length,
    topGenres: topGenres,
    averagePopularity: Math.round(
      recommendations.reduce((sum, r) => sum + (r.popularity || 0), 0) / recommendations.length
    )
  };
};

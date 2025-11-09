import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const LASTFM_API_URL = 'http://ws.audioscrobbler.com/2.0/';
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || null;
const LASTFM_SHARED_SECRET = process.env.LASTFM_SHARED_SECRET || null;

// Cache TTL for Last.fm data: 24 hours (86400 seconds)

// Log configuration status
if (LASTFM_API_KEY) {
  console.log('✅ Last.fm API Key configured');
} else {
  console.warn('⚠️ Last.fm API Key not configured - Discovery features may be limited');
}

if (LASTFM_SHARED_SECRET) {
  console.log('✅ Last.fm Shared Secret configured');
}

/**
 * Helper to make requests to Last.fm API
 */
const makeLastfmRequest = async (params) => {
  if (!LASTFM_API_KEY) {
    throw new Error('Last.fm API key not configured');
  }

  try {
    const response = await axios.get(LASTFM_API_URL, {
      params: {
        api_key: LASTFM_API_KEY,
        format: 'json',
        ...params
      },
      timeout: 8000
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching from Last.fm:', error.message);
    throw error;
  }
};

/**
 * Get credentials status
 * @returns {Object} Configuration status
 */
export const getCredentialsStatus = () => {
  return {
    apiKeyConfigured: !!LASTFM_API_KEY,
    sharedSecretConfigured: !!LASTFM_SHARED_SECRET,
    ready: !!(LASTFM_API_KEY && LASTFM_SHARED_SECRET)
  };
};

/**
 * Get similar artists from Last.fm based on seed artists
 * @param {Array} seedArtists - Array of artist objects from Spotify with name and id
 * @returns {Array} Array of similar artists
 */
export const getSimilarArtistsFromLastfm = async (seedArtists) => {
  
  // Try to get from cache

  const similarArtistsMap = new Map();
  const userArtistNames = new Set(seedArtists.map(a => a.name.toLowerCase()));

  console.log(`🎵 Fetching similar artists from Last.fm based on ${seedArtists.length} seed artists...`);

  // Fetch similar artists for each seed artist
  for (const seedArtist of seedArtists.slice(0, 8)) {
    try {
      const data = await makeLastfmRequest({
        method: 'artist.getSimilar',
        artist: seedArtist.name,
        limit: 15
      });

      if (data.similarartists?.artist) {
        const artists = Array.isArray(data.similarartists.artist)
          ? data.similarartists.artist
          : [data.similarartists.artist];

        for (const artist of artists) {
          const artistNameLower = artist.name.toLowerCase();

          // Skip if already in user's top artists
          if (userArtistNames.has(artistNameLower)) {
            continue;
          }

          // Skip if already processed
          if (similarArtistsMap.has(artistNameLower)) {
            const existing = similarArtistsMap.get(artistNameLower);
            existing.similarToArtists.push(seedArtist.name);
            existing.relevanceScore += 1;
            existing.matchCount += 1;
            continue;
          }

          // Parse similarity score (Last.fm returns as string 0-1)
          const similarity = parseFloat(artist.match) || 0;

          // Get artist image if available
          const image = artist.image?.[artist.image.length - 1]?.['#text'] || null;

          similarArtistsMap.set(artistNameLower, {
            name: artist.name,
            similarity: similarity,
            similarToArtists: [seedArtist.name],
            relevanceScore: similarity + 1,
            matchCount: 1,
            url: artist.url || null,
            image: image,
            genres: [] // Last.fm doesn't provide genres in similar endpoint
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching similar artists for ${seedArtist.name}:`, error.message);
    }
  }

  // Sort by relevance and return top results (reduced to 12 for performance)
  const similarArtists = Array.from(similarArtistsMap.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 12);

  console.log(`✅ Found ${similarArtists.length} similar artists from Last.fm`);

  return similarArtists;
};

/**
 * Get top albums from Last.fm for an artist
 * @param {string} artistName - Artist name
 * @param {number} limit - Number of albums to return
 * @returns {Array} Array of albums
 */
export const getArtistTopAlbumsFromLastfm = async (artistName, limit = 5) => {

  // Try to get from cache

  try {
    const data = await makeLastfmRequest({
      method: 'artist.getTopAlbums',
      artist: artistName,
      limit: limit * 3 // Get more to filter singles and other unwanted albums
    });

    if (data.topalbums?.album) {
      const albums = Array.isArray(data.topalbums.album)
        ? data.topalbums.album
        : [data.topalbums.album];

      // First filter: compilations and live albums
      const filteredByName = albums.filter(album => {
        const name = album.name.toLowerCase();
        return !name.includes('compilation') && !name.includes('live');
      });

      // Second filter: get album details to check track count (in parallel for speed)
      const albumsWithDetails = [];

      // OPTIMIZATION: Fetch album details in parallel instead of sequentially
      const albumDetailPromises = filteredByName.slice(0, limit * 2).map(async (album) => {
        try {
          // Get detailed album info to check track count
          const albumInfo = await makeLastfmRequest({
            method: 'album.getInfo',
            artist: artistName,
            album: album.name
          });

          if (albumInfo.album) {
            const trackCount = Array.isArray(albumInfo.album.tracks?.track)
              ? albumInfo.album.tracks.track.length
              : (albumInfo.album.tracks?.track ? 1 : 0);

            // Filter out singles (albums with only 1 track)
            if (trackCount >= 2) {
              return {
                name: album.name,
                artist: artistName,
                playcount: parseInt(album.playcount) || 0,
                url: album.url || null,
                image: album.image?.[album.image.length - 1]?.['#text'] || null,
                mbid: album.mbid || null,
                trackCount: trackCount
              };
            } else {
              console.log(`  ⏭️  Skipping single: ${album.name} (${trackCount} track)`);
              return null;
            }
          }
          return null;
        } catch (error) {
          // If we can't get album details, skip it to be safe
          console.error(`Error fetching details for album ${album.name}:`, error.message);
          return null;
        }
      });

      // Wait for all album detail fetches to complete
      const albumDetailResults = await Promise.allSettled(albumDetailPromises);

      // Collect successful results
      albumDetailResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value && albumsWithDetails.length < limit) {
          albumsWithDetails.push(result.value);
        }
      });

      console.log(`📀 Last.fm albums for ${artistName}: ${albums.length} total, ${albumsWithDetails.length} after filtering singles`);

      return albumsWithDetails;
    }

    return [];
  } catch (error) {
    console.error(`Error fetching top albums for ${artistName}:`, error.message);
    return [];
  }
};

/**
 * Get artist info from Last.fm
 * @param {string} artistName - Artist name
 * @returns {Object} Artist information
 */
export const getArtistInfoFromLastfm = async (artistName) => {
  
  // Try to get from cache

  try {
    const data = await makeLastfmRequest({
      method: 'artist.getInfo',
      artist: artistName
    });

    if (data.artist) {
      const artist = data.artist;
      const result = {
        name: artist.name,
        listeners: parseInt(artist.listeners) || 0,
        playcount: parseInt(artist.playcount) || 0,
        url: artist.url || null,
        image: artist.image?.[artist.image.length - 1]?.['#text'] || null,
        bio: artist.bio?.summary || null,
        similar: artist.similar?.artist 
          ? (Array.isArray(artist.similar.artist) 
              ? artist.similar.artist.slice(0, 5).map(a => a.name)
              : [artist.similar.artist.name])
          : [],
        tags: artist.tags?.tag
          ? (Array.isArray(artist.tags.tag)
              ? artist.tags.tag.slice(0, 5).map(t => t.name)
              : [artist.tags.tag.name])
          : []
      };

      return result;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching artist info for ${artistName}:`, error.message);
    return null;
  }
};

/**
 * Get tags (genres) for an artist from Last.fm
 * @param {string} artistName - Artist name
 * @returns {Array} Array of tags/genres
 */
export const getArtistTagsFromLastfm = async (artistName) => {
  
  // Try to get from cache

  try {
    const data = await makeLastfmRequest({
      method: 'artist.getTopTags',
      artist: artistName,
      limit: 10
    });

    let tags = [];
    if (data.toptags?.tag) {
      const tagList = Array.isArray(data.toptags.tag)
        ? data.toptags.tag
        : [data.toptags.tag];

      tags = tagList.map(t => ({
        name: t.name,
        count: parseInt(t.count) || 0,
        url: t.url || null
      }));
    }

    return tags;
  } catch (error) {
    console.error(`Error fetching tags for ${artistName}:`, error.message);
    return [];
  }
};

/**
 * Search for an album in Last.fm
 * @param {string} artist - Artist name
 * @param {string} album - Album name
 * @returns {Object} Album information
 */
export const searchAlbumLastfm = async (artist, album) => {
  
  // Try to get from cache

  try {
    const data = await makeLastfmRequest({
      method: 'album.getInfo',
      artist: artist,
      album: album
    });

    if (data.album) {
      const album = data.album;
      const result = {
        name: album.name,
        artist: album.artist,
        url: album.url || null,
        image: album.image?.[album.image.length - 1]?.['#text'] || null,
        listeners: parseInt(album.listeners) || 0,
        playcount: parseInt(album.playcount) || 0,
        tracks: Array.isArray(album.tracks?.track)
          ? album.tracks.track.map(t => ({
              name: t.name,
              url: t.url || null,
              duration: parseInt(t.duration) || 0
            }))
          : [],
        wiki: album.wiki?.summary || null
      };

      return result;
    }

    return null;
  } catch (error) {
    console.error(`Error searching album ${artist} - ${album}:`, error.message);
    return null;
  }
};

/**
 * NOTAS SOBRE AUTENTICACIÓN CON SHARED_SECRET:
 * 
 * El SHARED_SECRET se usa para:
 * 1. Firmar requests privados (user.getInfo, etc.)
 * 2. Autenticación de usuarios (OAuth-like flow)
 * 3. Scrobbling de tracks (enviar lo que el usuario escucha)
 * 
 * Implementación futura (si necesitas):
 * - Obtener info privada del usuario autenticado
 * - Hacer scrobbling de canciones escuchadas
 * - Implementar "Love" de tracks
 * 
 * Para usar SHARED_SECRET, necesitarías:
 * 1. Implementar cryptosum MD5 de los parámetros
 * 2. Usar método POST en lugar de GET
 * 3. Incluir session_key del usuario autenticado
 * 
 * Por ahora, el servicio usa solo API_KEY (lectura pública)
 * que es suficiente para encontrar artistas similares.
 */

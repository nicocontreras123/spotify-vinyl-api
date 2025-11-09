import { spotifyApi } from '../config/spotify.js';

export const getUserTopTracks = async (timeRange = 'medium_term', limit = 50) => {
  try {
    const data = await spotifyApi.getMyTopTracks({
      time_range: timeRange,
      limit: limit
    });

    return data.body.items;
  } catch (error) {
    console.error('Error fetching top tracks:', error);

    // Handle 401/403 authentication errors specifically
    if (error.statusCode === 401 || error.statusCode === 403) {
      const authError = new Error('El token de acceso ha expirado o tiene permisos insuficientes.');
      authError.statusCode = error.statusCode; // Preserve status code
      throw authError;
    }

    const errorMessage = error.body?.error?.message || error.message || `Estado ${error.statusCode || 'desconocido'}`;
    const err = new Error(`Error al obtener las canciones más escuchadas: ${errorMessage}`);
    err.statusCode = error.statusCode; // Preserve status code
    throw err;
  }
};

export const getUserTopArtists = async (timeRange = 'medium_term', limit = 50) => {
  try {
    const data = await spotifyApi.getMyTopArtists({
      time_range: timeRange,
      limit: limit
    });

    return data.body.items;
  } catch (error) {
    console.error('Error fetching top artists:', error);

    // Handle 401/403 authentication errors specifically
    if (error.statusCode === 401 || error.statusCode === 403) {
      const authError = new Error('El token de acceso ha expirado o tiene permisos insuficientes.');
      authError.statusCode = error.statusCode; // Preserve status code
      throw authError;
    }

    const errorMessage = error.body?.error?.message || error.message || `Estado ${error.statusCode || 'desconocido'}`;
    const err = new Error(`Error al obtener los artistas más escuchados: ${errorMessage}`);
    err.statusCode = error.statusCode; // Preserve status code
    throw err;
  }
};

export const getArtistTopAlbums = async (artistId, limit = 5) => {
  try {
    // Fetch more albums to account for filtering out singles
    const fetchLimit = limit * 3; // Fetch 3x more to ensure we have enough after filtering
    const data = await spotifyApi.getArtistAlbums(artistId, {
      limit: fetchLimit,
      include_groups: 'album',
      country: 'US'
    });

    // Filter out singles (albums with only 1 track)
    const filteredAlbums = data.body.items.filter(album => {
      // Filter out singles - they rarely have vinyl versions
      return album.total_tracks >= 2;
    });

    console.log(`🎵 Artist albums: ${data.body.items.length} total, ${filteredAlbums.length} after filtering singles`);

    // Return only the requested limit
    return filteredAlbums.slice(0, limit);
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    const errorMessage = error.body?.error?.message || error.message || JSON.stringify(error);
    throw new Error(`Error al obtener los álbumes del artista: ${errorMessage}`);
  }
};

/**
 * Get related/similar artists from Spotify
 */
export const getRelatedArtists = async (artistId) => {
  try {
    const data = await spotifyApi.getArtistRelatedArtists(artistId);
    return data.body.artists;
  } catch (error) {
    console.error('Error fetching related artists:', error);
    const errorMessage = error.body?.error?.message || error.message || JSON.stringify(error);
    throw new Error(`Error al obtener artistas relacionados: ${errorMessage}`);
  }
};

/**
 * Get artist details
 */
export const getArtist = async (artistId) => {
  try {
    const data = await spotifyApi.getArtist(artistId);
    return data.body;
  } catch (error) {
    console.error('Error fetching artist:', error);
    const errorMessage = error.body?.error?.message || error.message || JSON.stringify(error);
    throw new Error(`Error al obtener información del artista: ${errorMessage}`);
  }
};

export const getAlbumDetails = async (albumId) => {
  try {
    const [albumData, tracksData] = await Promise.all([
      spotifyApi.getAlbum(albumId),
      spotifyApi.getAlbumTracks(albumId, { limit: 50 })
    ]);

    const album = albumData.body;
    const tracks = tracksData.body.items;

    const result = {
      id: album.id,
      name: album.name,
      artists: album.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        uri: artist.uri,
        externalUrls: artist.external_urls
      })),
      releaseDate: album.release_date,
      totalTracks: album.total_tracks,
      images: album.images,
      genres: album.genres,
      popularity: album.popularity,
      uri: album.uri,
      externalUrls: album.external_urls,
      // Playback information for web applications
      playback: {
        spotifyUri: album.uri, // Use with Spotify Web Playback SDK
        webPlayerUrl: album.external_urls?.spotify || `https://open.spotify.com/album/${album.id}`,
        embedUrl: `https://open.spotify.com/embed/album/${album.id}`, // For iframe embedding
        canEmbed: true
      },
      // Legacy fields (kept for backwards compatibility)
      spotifyWebUrl: album.external_urls?.spotify || null,
      spotifyAppUrl: `spotify:album:${album.id}`,
      playLink: album.external_urls?.spotify || null,
      label: album.label,
      copyrights: album.copyrights,
      availableMarkets: album.available_markets || [],
      tracks: tracks.map(track => ({
        id: track.id,
        name: track.name,
        track_number: track.track_number,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        uri: track.uri,
        previewUrl: track.preview_url,
        hasPreview: !!track.preview_url,
        // Enhanced playback information for each track
        playback: {
          spotifyUri: track.uri, // Use with Spotify Web Playback SDK: spotify:track:xxxxx
          webPlayerUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
          embedUrl: `https://open.spotify.com/embed/track/${track.id}`, // For iframe embedding
          previewUrl: track.preview_url, // 30-second preview (if available)
          canEmbed: true
        },
        // Legacy fields (kept for backwards compatibility)
        spotifyWebUrl: track.external_urls?.spotify || null,
        spotifyAppUrl: `spotify:track:${track.id}`,
        availableMarkets: track.available_markets || [],
        isPlayable: track.is_playable !== false, // Default to true if not specified
        restrictions: track.restrictions || null,
        artists: track.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          uri: artist.uri,
          externalUrls: artist.external_urls
        }))
      }))
    };

    return result;
  } catch (error) {
    console.error('Error fetching album details:', error);
    const errorMessage = error.body?.error?.message || error.message || JSON.stringify(error);
    throw new Error(`Error al obtener detalles del álbum: ${errorMessage}`);
  }
};

export const searchAlbums = async (query, limit = 20) => {
  try {
    const data = await spotifyApi.searchAlbums(query, { limit });

    // Filter out singles (albums with only 1 track) as they rarely have vinyl versions
    const albums = data.body.albums.items
      .filter(album => album.total_tracks >= 2)
      .map(album => ({
        id: album.id,
        name: album.name,
        artist: album.artists[0].name,
        artists: album.artists.map(artist => ({
          id: artist.id,
          name: artist.name
        })),
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        images: album.images,
        coverImage: album.images[0]?.url || null,
        uri: album.uri
      }));

    return albums;
  } catch (error) {
    console.error('Error searching albums:', error);

    // Handle 401/403 authentication errors specifically
    if (error.statusCode === 401 || error.statusCode === 403) {
      const authError = new Error('El token de acceso ha expirado o tiene permisos insuficientes.');
      authError.statusCode = error.statusCode;
      throw authError;
    }

    const errorMessage = error.body?.error?.message || error.message || `Estado ${error.statusCode || 'desconocido'}`;
    const err = new Error(`Error al buscar álbumes: ${errorMessage}`);
    err.statusCode = error.statusCode;
    throw err;
  }
};

export const getAnalysisData = async (timeRange = 'medium_term') => {
  try {
    const [topTracks, topArtists] = await Promise.all([
      getUserTopTracks(timeRange, 50),
      getUserTopArtists(timeRange, 50)
    ]);

    // Extract unique albums from top tracks
    // Filter out singles (albums with only 1 track) as they rarely have vinyl versions
    const albums = [...new Map(
      topTracks
        .filter(track => track.album)
        .filter(track => track.album.total_tracks >= 2) // Only albums/EPs with 2+ tracks
        .map(track => [track.album.id, {
          id: track.album.id,
          name: track.album.name,
          artist: track.album.artists[0].name,
          releaseDate: track.album.release_date,
          images: track.album.images,
          uri: track.album.uri,
          totalTracks: track.album.total_tracks
        }])
    ).values()];

    console.log(`📀 Filtered albums: ${albums.length} (excluded singles with 1 track)`);

    return {
      topTracks: topTracks.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        popularity: track.popularity
      })),
      topArtists: topArtists.map(artist => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres,
        popularity: artist.popularity,
        images: artist.images
      })),
      topAlbums: albums
    };
  } catch (error) {
    console.error('Error fetching analysis data:', error);

    // Preserve statusCode if it exists (for authentication errors)
    if (error.statusCode === 401 || error.statusCode === 403) {
      // Re-throw the error as-is to preserve authentication error details
      throw error;
    }

    const errorMessage = error.body?.error?.message || error.message || JSON.stringify(error);
    const err = new Error(`Error al obtener datos de análisis: ${errorMessage}`);
    err.statusCode = error.statusCode; // Preserve status code
    throw err;
  }
};

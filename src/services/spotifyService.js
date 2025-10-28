import { spotifyApi } from '../config/spotify.js';

export const getUserTopTracks = async (timeRange = 'medium_term', limit = 50) => {
  try {
    const data = await spotifyApi.getMyTopTracks({
      time_range: timeRange,
      limit: limit
    });
    return data.body.items;
  } catch (error) {
    throw new Error(`Error fetching top tracks: ${error.message}`);
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
    throw new Error(`Error fetching top artists: ${error.message}`);
  }
};

export const getArtistTopAlbums = async (artistId, limit = 5) => {
  try {
    const data = await spotifyApi.getArtistAlbums(artistId, {
      limit: limit,
      include_groups: 'album',
      country: 'US'
    });
    return data.body.items;
  } catch (error) {
    throw new Error(`Error fetching artist albums: ${error.message}`);
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

    return {
      id: album.id,
      name: album.name,
      artists: album.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        uri: artist.uri
      })),
      releaseDate: album.release_date,
      totalTracks: album.total_tracks,
      images: album.images,
      genres: album.genres,
      popularity: album.popularity,
      uri: album.uri,
      externalUrls: album.external_urls,
      label: album.label,
      copyrights: album.copyrights,
      tracks: tracks.map(track => ({
        id: track.id,
        name: track.name,
        trackNumber: track.track_number,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        uri: track.uri,
        previewUrl: track.preview_url,
        artists: track.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          uri: artist.uri
        }))
      }))
    };
  } catch (error) {
    throw new Error(`Error fetching album details: ${error.message}`);
  }
};

export const getAnalysisData = async (timeRange = 'medium_term') => {
  try {
    const [topTracks, topArtists] = await Promise.all([
      getUserTopTracks(timeRange, 50),
      getUserTopArtists(timeRange, 50)
    ]);

    // Extract unique albums from top tracks
    const albums = [...new Map(
      topTracks
        .filter(track => track.album)
        .map(track => [track.album.id, {
          id: track.album.id,
          name: track.album.name,
          artist: track.album.artists[0].name,
          releaseDate: track.album.release_date,
          images: track.album.images,
          uri: track.album.uri
        }])
    ).values()];

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
    throw new Error(`Error fetching analysis data: ${error.message}`);
  }
};

import {
  markAlbumAsOwned,
  unmarkAlbumAsOwned,
  markAlbumAsFavorite,
  unmarkAlbumAsFavorite,
  getUserOwnedAlbums,
  getUserFavoriteAlbums,
  getUserAlbumStatus
} from '../services/userVinylService.js';

/**
 * Mark album as owned
 * POST /api/user/vinyls/owned
 * Body: { albumId, albumName, artist }
 */
export const addOwnedAlbum = async (req, res) => {
  try {
    const { albumId, albumName, artist } = req.body;
    const userId = req.user.userId;

    if (!albumId || !albumName || !artist) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere albumId, albumName y artist'
      });
    }

    const result = await markAlbumAsOwned(userId, albumId, albumName, artist);

    if (result.alreadyMarked) {
      return res.json({
        success: true,
        message: 'Este álbum ya estaba marcado como poseído',
        alreadyMarked: true
      });
    }

    res.json({
      success: true,
      message: 'Álbum marcado como poseído',
      markedAt: result.markedAt
    });
  } catch (error) {
    console.error('Error adding owned album:', error);
    res.status(500).json({
      error: 'Error al marcar álbum',
      message: 'No se pudo marcar el álbum como poseído'
    });
  }
};

/**
 * Remove album from owned
 * DELETE /api/user/vinyls/owned/:albumId
 */
export const removeOwnedAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const userId = req.user.userId;

    const result = await unmarkAlbumAsOwned(userId, albumId);

    res.json({
      success: true,
      message: 'Álbum desmarcado',
      removed: result.removed
    });
  } catch (error) {
    console.error('Error removing owned album:', error);
    res.status(500).json({
      error: 'Error al desmarcar álbum',
      message: 'No se pudo desmarcar el álbum'
    });
  }
};

/**
 * Mark album as favorite
 * POST /api/user/vinyls/favorite
 * Body: { albumId, albumName, artist }
 */
export const addFavoriteAlbum = async (req, res) => {
  try {
    const { albumId, albumName, artist } = req.body;
    const userId = req.user.userId;

    if (!albumId || !albumName || !artist) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere albumId, albumName y artist'
      });
    }

    const result = await markAlbumAsFavorite(userId, albumId, albumName, artist);

    if (result.alreadyMarked) {
      return res.json({
        success: true,
        message: 'Este álbum ya estaba marcado como favorito',
        alreadyMarked: true
      });
    }

    res.json({
      success: true,
      message: 'Álbum marcado como favorito',
      markedAt: result.markedAt
    });
  } catch (error) {
    console.error('Error adding favorite album:', error);
    res.status(500).json({
      error: 'Error al marcar favorito',
      message: 'No se pudo marcar el álbum como favorito'
    });
  }
};

/**
 * Remove album from favorites
 * DELETE /api/user/vinyls/favorite/:albumId
 */
export const removeFavoriteAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const userId = req.user.userId;

    const result = await unmarkAlbumAsFavorite(userId, albumId);

    res.json({
      success: true,
      message: 'Favorito removido',
      removed: result.removed
    });
  } catch (error) {
    console.error('Error removing favorite album:', error);
    res.status(500).json({
      error: 'Error al remover favorito',
      message: 'No se pudo remover el favorito'
    });
  }
};

/**
 * Get user's owned albums
 * GET /api/user/vinyls/owned
 */
export const getOwnedAlbums = async (req, res) => {
  try {
    const userId = req.user.userId;

    const albums = await getUserOwnedAlbums(userId);

    res.json({
      success: true,
      owned: albums,
      count: albums.length
    });
  } catch (error) {
    console.error('Error getting owned albums:', error);
    res.status(500).json({
      error: 'Error al obtener álbumes',
      message: 'No se pudieron obtener los álbumes poseídos'
    });
  }
};

/**
 * Get user's favorite albums
 * GET /api/user/vinyls/favorites
 */
export const getFavoriteAlbums = async (req, res) => {
  try {
    const userId = req.user.userId;

    const albums = await getUserFavoriteAlbums(userId);

    res.json({
      success: true,
      favorites: albums,
      count: albums.length
    });
  } catch (error) {
    console.error('Error getting favorite albums:', error);
    res.status(500).json({
      error: 'Error al obtener favoritos',
      message: 'No se pudieron obtener los álbumes favoritos'
    });
  }
};

/**
 * Get user's album status (owned + favorites)
 * GET /api/user/vinyls/status
 */
export const getAlbumStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const status = await getUserAlbumStatus(userId);

    res.json({
      success: true,
      owned: Array.from(status.owned),
      favorites: Array.from(status.favorites)
    });
  } catch (error) {
    console.error('Error getting album status:', error);
    res.status(500).json({
      error: 'Error al obtener estado',
      message: 'No se pudo obtener el estado de los álbumes'
    });
  }
};

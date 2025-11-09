import * as wishlistService from '../services/wishlistService.js';

/**
 * Add album to wishlist
 */
export const addToWishlistController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { albumId, albumName, artist, coverImage } = req.body;

    if (!albumId || !albumName || !artist) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere albumId, albumName y artist'
      });
    }

    const result = await wishlistService.addToWishlist(userId, albumId, albumName, artist, coverImage);

    res.json({
      success: true,
      message: 'Álbum agregado a la lista de deseos',
      data: result
    });
  } catch (error) {
    console.error('Error in addToWishlistController:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Remove album from wishlist
 */
export const removeFromWishlistController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { albumId } = req.params;

    if (!albumId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere albumId'
      });
    }

    await wishlistService.removeFromWishlist(userId, albumId);

    res.json({
      success: true,
      message: 'Álbum eliminado de la lista de deseos'
    });
  } catch (error) {
    console.error('Error in removeFromWishlistController:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get user's wishlist
 */
export const getWishlistController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wishlist = await wishlistService.getWishlist(userId);

    res.json({
      success: true,
      data: wishlist,
      count: wishlist.length
    });
  } catch (error) {
    console.error('Error in getWishlistController:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check if album is in wishlist
 */
export const checkWishlistStatusController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { albumId } = req.params;

    if (!albumId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere albumId'
      });
    }

    const inWishlist = await wishlistService.isInWishlist(userId, albumId);

    res.json({
      success: true,
      inWishlist
    });
  } catch (error) {
    console.error('Error in checkWishlistStatusController:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

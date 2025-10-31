import express from 'express';
import {
  addOwnedAlbum,
  removeOwnedAlbum,
  addFavoriteAlbum,
  removeFavoriteAlbum,
  getOwnedAlbums,
  getFavoriteAlbums,
  getAlbumStatus
} from '../controllers/userVinylController.js';
import { requireAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

/**
 * User Vinyl Management Routes
 * Base path: /api/user/vinyls
 * All routes require authentication
 */

// Owned Albums Routes
// POST /api/user/vinyls/owned
// Body: { albumId, albumName, artist }
router.post('/owned', requireAuth, addOwnedAlbum);

// DELETE /api/user/vinyls/owned/:albumId
router.delete('/owned/:albumId', requireAuth, removeOwnedAlbum);

// GET /api/user/vinyls/owned
router.get('/owned', requireAuth, getOwnedAlbums);

// Favorite Albums Routes
// POST /api/user/vinyls/favorite
// Body: { albumId, albumName, artist }
router.post('/favorite', requireAuth, addFavoriteAlbum);

// DELETE /api/user/vinyls/favorite/:albumId
router.delete('/favorite/:albumId', requireAuth, removeFavoriteAlbum);

// GET /api/user/vinyls/favorites
router.get('/favorites', requireAuth, getFavoriteAlbums);

// Get user's album status (owned + favorites)
// GET /api/user/vinyls/status
router.get('/status', requireAuth, getAlbumStatus);

export default router;

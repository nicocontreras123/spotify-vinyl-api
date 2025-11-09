import express from 'express';
import {
  addToWishlistController,
  removeFromWishlistController,
  getWishlistController,
  checkWishlistStatusController
} from '../controllers/wishlistController.js';
import { requireAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

// All wishlist routes require user authentication
router.use(requireAuth);

// Get user's wishlist
router.get('/', getWishlistController);

// Add album to wishlist
router.post('/', addToWishlistController);

// Remove album from wishlist
router.delete('/:albumId', removeFromWishlistController);

// Check if album is in wishlist
router.get('/status/:albumId', checkWishlistStatusController);

export default router;

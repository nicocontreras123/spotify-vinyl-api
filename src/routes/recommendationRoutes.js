import express from 'express';
import { getUserAnalysis, getVinylRecommendations, getAlbumDetailsController, getDiscoveryRecommendations } from '../controllers/recommendationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

// Spotify authentication routes (require Spotify token)
router.get('/analysis', authenticateToken, getUserAnalysis);
router.get('/album/:id', authenticateToken, getAlbumDetailsController);

// Recommendation routes (work with or without user login, but require Spotify token)
// optionalAuth checks for JWT user token, authenticateToken requires Spotify token
router.get('/vinyl-recommendations', authenticateToken, optionalAuth, getVinylRecommendations);
router.get('/discovery-recommendations', authenticateToken, optionalAuth, getDiscoveryRecommendations);

export default router;

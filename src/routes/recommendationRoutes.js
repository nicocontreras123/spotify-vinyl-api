import express from 'express';
import { getUserAnalysis, getVinylRecommendations, getAlbumDetailsController, getDiscoveryRecommendations } from '../controllers/recommendationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.get('/analysis', authenticateToken, getUserAnalysis);
router.get('/vinyl-recommendations', authenticateToken, getVinylRecommendations);
router.get('/discovery-recommendations', authenticateToken, getDiscoveryRecommendations);
router.get('/album/:id', authenticateToken, getAlbumDetailsController);

export default router;

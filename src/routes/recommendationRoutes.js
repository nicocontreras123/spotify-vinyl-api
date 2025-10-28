import express from 'express';
import { getUserAnalysis, getVinylRecommendations, getAlbumDetailsController } from '../controllers/recommendationController.js';

const router = express.Router();

router.get('/analysis', getUserAnalysis);
router.get('/vinyl-recommendations', getVinylRecommendations);
router.get('/album/:id', getAlbumDetailsController);

export default router;

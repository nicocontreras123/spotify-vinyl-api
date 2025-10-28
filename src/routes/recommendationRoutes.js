import express from 'express';
import { getUserAnalysis, getVinylRecommendations } from '../controllers/recommendationController.js';

const router = express.Router();

router.get('/analysis', getUserAnalysis);
router.get('/vinyl-recommendations', getVinylRecommendations);

export default router;

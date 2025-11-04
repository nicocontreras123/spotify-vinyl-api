import express from 'express';
import { searchPricesController, getCheapestPriceController, comparePricesController } from '../controllers/priceController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All price routes require Spotify authentication
// Price search routes
router.get('/search', authenticateToken, searchPricesController);
router.get('/cheapest', authenticateToken, getCheapestPriceController);
router.get('/compare', authenticateToken, comparePricesController);

export default router;

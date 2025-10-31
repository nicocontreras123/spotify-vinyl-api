import express from 'express';
import { register, login, getCurrentUser } from '../controllers/userAuthController.js';
import { requireAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

/**
 * User Authentication Routes
 * Base path: /api/auth
 */

// Register new user
// POST /api/auth/register
// Body: { email, password }
router.post('/register', register);

// Login user
// POST /api/auth/login
// Body: { email, password }
router.post('/login', login);

// Get current user info (requires authentication)
// GET /api/auth/me
// Header: Authorization: Bearer <token>
router.get('/me', requireAuth, getCurrentUser);

export default router;

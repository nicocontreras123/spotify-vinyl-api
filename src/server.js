import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import userAuthRoutes from './routes/userAuthRoutes.js';
import userVinylRoutes from './routes/userVinylRoutes.js';
import priceRoutes from './routes/priceRoutes.js';
import { callback } from './controllers/authController.js';
import { initializeDatabase } from './config/database.js';

dotenv.config();

// Debug: Check SerpAPI configuration
console.log('🔍 SerpAPI Debug:');
console.log('  - Key exists:', !!process.env.SERPAPI_KEY);
console.log('  - Key length:', process.env.SERPAPI_KEY?.length || 0);
console.log('  - Key preview:', process.env.SERPAPI_KEY?.substring(0, 10) + '...' || 'NOT SET');

// Initialize database
(async () => {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    console.log('⚠️  API will continue but database features will not work');
  }
})();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// Parse allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

console.log('🌐 CORS Configuration:');
console.log('  - Environment:', process.env.NODE_ENV || 'development');
console.log('  - Allowed Origins:', allowedOrigins);

// In development, allow all origins. In production, use allowed origins list.
const corsOptions = isDevelopment
  ? {
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Token']
    }
  : {
      origin: function (origin, callback) {
        console.log('🔍 CORS check for origin:', origin);

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          console.log('✅ No origin header - allowing request');
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          console.log('✅ Origin allowed:', origin);
          callback(null, true);
        } else {
          console.log('❌ CORS blocked origin:', origin);
          console.log('   Allowed origins:', allowedOrigins);
          callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Token']
    };

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Spotify Vinyl Recommendation API',
    version: '1.0.0',
    endpoints: {
      spotifyAuth: {
        login: 'GET /auth/login - Get Spotify authorization URL',
        callback: 'GET /callback - Spotify OAuth callback',
        logout: 'POST /auth/logout - Logout and clear Spotify tokens'
      },
      userAuth: {
        register: 'POST /api/auth/register - Register with email/password',
        login: 'POST /api/auth/login - Login with email/password',
        me: 'GET /api/auth/me - Get current user info'
      },
      recommendations: {
        analysis: 'GET /api/analysis - Get your listening analysis',
        vinyl: 'GET /api/vinyl-recommendations - Get vinyl recommendations',
        discovery: 'GET /api/discovery-recommendations - Discover new albums',
        albumDetails: 'GET /api/album/:id - Get detailed information about a specific album'
      },
      userVinyls: {
        addOwned: 'POST /api/user/vinyls/owned - Mark album as owned',
        removeOwned: 'DELETE /api/user/vinyls/owned/:albumId - Remove owned album',
        addFavorite: 'POST /api/user/vinyls/favorite - Mark album as favorite',
        removeFavorite: 'DELETE /api/user/vinyls/favorite/:albumId - Remove favorite',
        getOwned: 'GET /api/user/vinyls/owned - Get owned albums',
        getFavorites: 'GET /api/user/vinyls/favorites - Get favorite albums',
        getStatus: 'GET /api/user/vinyls/status - Get album status (owned + favorites)'
      },
      prices: {
        search: 'GET /api/prices/search?artist=ARTIST&album=ALBUM - Search prices in Chilean stores',
        cheapest: 'GET /api/prices/cheapest?artist=ARTIST&album=ALBUM - Get cheapest price',
        compare: 'GET /api/prices/compare?artist=ARTIST&album=ALBUM - Compare prices by store'
      }
    },
    instructions: [
      '1. Visit /auth/login to get the Spotify authorization URL',
      '2. Authorize the application in your browser',
      '3. After authorization, visit /api/vinyl-recommendations to get your personalized vinyl recommendations',
      '4. (Optional) Register with /api/auth/register to mark albums as owned or favorite',
      '5. Use /api/album/{album_id} to get detailed information about any album'
    ]
  });
});

// Callback route at root level to match Spotify configuration
app.get('/callback', callback);

// Spotify OAuth routes
app.use('/auth', authRoutes);

// API routes
app.use('/api', recommendationRoutes);

// User authentication routes (email/password)
app.use('/api/auth', userAuthRoutes);

// User vinyl management routes
app.use('/api/user/vinyls', userVinylRoutes);

// Price comparison routes
app.use('/api/prices', priceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🎵 Spotify Vinyl API running on http://localhost:${PORT}`);
  console.log(`📀 Ready to recommend vinyl records!`);
  console.log(`\nTo get started:`);
  console.log(`1. Make sure your .env file has your Spotify credentials`);
  console.log(`2. Visit http://localhost:${PORT}/auth/login`);
});

export default app;


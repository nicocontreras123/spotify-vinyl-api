import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import { callback } from './controllers/authController.js';

dotenv.config();

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
      allowedHeaders: ['Content-Type', 'Authorization']
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
      allowedHeaders: ['Content-Type', 'Authorization']
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
      authentication: {
        login: 'GET /auth/login - Get Spotify authorization URL',
        callback: 'GET /callback - Spotify OAuth callback'
      },
      data: {
        analysis: 'GET /api/analysis - Get your listening analysis',
        recommendations: 'GET /api/vinyl-recommendations - Get vinyl recommendations'
      }
    },
    instructions: [
      '1. Visit /auth/login to get the Spotify authorization URL',
      '2. Authorize the application in your browser',
      '3. After authorization, visit /api/vinyl-recommendations to get your personalized vinyl recommendations'
    ]
  });
});

// Callback route at root level to match Spotify configuration
app.get('/callback', callback);

app.use('/auth', authRoutes);
app.use('/api', recommendationRoutes);

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

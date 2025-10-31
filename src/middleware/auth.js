import { spotifyApi } from '../config/spotify.js';

/**
 * Middleware to authenticate requests using Bearer token from Authorization header
 * Validates the token by trying to fetch user data from Spotify
 * If token is invalid/expired, returns 401 and frontend will handle re-authentication
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  console.log('🔐 Auth Middleware:');
  console.log('  - Auth header present:', !!authHeader);
  console.log('  - Token present:', !!token);
  if (token) {
    console.log('  - Token length:', token.length);
    console.log('  - Token preview:', token.substring(0, 20) + '...');
  }

  if (!token) {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'No se proporcionó token de acceso. Por favor, autentícate con Spotify primero.'
    });
  }

  try {
    // Set the access token for this request
    spotifyApi.setAccessToken(token);
    console.log('  - Token set in spotifyApi successfully');

    // Validate token by fetching user data from Spotify
    // This also gives us the user ID for caching
    try {
      const userData = await spotifyApi.getMe();
      req.userId = userData.body.id;
      console.log('  - User ID:', req.userId);
      console.log('  - Token is valid ✅');
    } catch (userError) {
      // Token is invalid or expired
      console.error('  - Token validation failed:', userError.message);
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El token de acceso ha expirado o es inválido.'
      });
    }

    next();
  } catch (error) {
    console.error('  - Error in auth middleware:', error);
    return res.status(401).json({
      error: 'Token inválido',
      message: 'El token de acceso proporcionado es inválido o ha expirado.'
    });
  }
};

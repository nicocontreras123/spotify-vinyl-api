import { spotifyApi } from '../config/spotify.js';
import { ensureValidToken } from '../controllers/authController.js';

/**
 * Middleware to authenticate requests using Bearer token from Authorization header
 * También se encarga de renovar el token si ha expirado
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
      error: 'Not authenticated',
      message: 'No access token provided. Please authenticate with Spotify first.'
    });
  }

  try {
    // Set the access token for this request
    spotifyApi.setAccessToken(token);
    console.log('  - Token set in spotifyApi successfully');

    // Intentar renovar el token si es necesario (usando el stored refresh token)
    try {
      await ensureValidToken();
      console.log('  - Token validado y renovado si fue necesario');
    } catch (refreshError) {
      console.warn('  - No se pudo auto-renovar el token (continuando con el token actual):', refreshError.message);
      // Continuar con el token actual - si está realmente expirado, la siguiente petición fallará
    }

    // Get user ID for caching
    try {
      const userData = await spotifyApi.getMe();
      req.userId = userData.body.id;
      console.log('  - User ID:', req.userId);
    } catch (userError) {
      console.warn('  - Could not fetch user ID (will continue without caching):', userError.message);
      // Continue without userId - caching will be disabled for this request
    }

    next();
  } catch (error) {
    console.error('  - Error setting token:', error);
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided access token is invalid or expired.'
    });
  }
};

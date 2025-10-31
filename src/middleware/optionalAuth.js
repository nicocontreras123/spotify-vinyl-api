import { verifyToken } from '../services/authService.js';

/**
 * Optional authentication middleware
 * Verifies JWT token if present, but allows request to continue without it
 * Sets req.user if token is valid
 * This allows the app to work without login, but unlocks features for logged users
 *
 * NOTE: Reads token from X-User-Token header (not Authorization) to avoid conflicts with Spotify token
 */
export const optionalAuth = async (req, res, next) => {
  // Check for user JWT in custom header (X-User-Token)
  const token = req.headers['x-user-token'];

  if (!token) {
    // No token provided - continue without user authentication
    req.user = null;
    return next();
  }

  try {
    // Verify and decode token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    console.log(`✅ Usuario autenticado: ${decoded.email} (ID: ${decoded.userId})`);
    next();
  } catch (error) {
    // Invalid token - continue without authentication
    console.warn('⚠️ Token inválido:', error.message);
    req.user = null;
    next();
  }
};

/**
 * Required authentication middleware
 * Requires valid JWT token - returns 401 if not authenticated
 * Use this for endpoints that MUST have user authentication
 *
 * NOTE: Reads token from X-User-Token header (not Authorization) to avoid conflicts with Spotify token
 */
export const requireAuth = async (req, res, next) => {
  const token = req.headers['x-user-token'];

  if (!token) {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Se requiere iniciar sesión para acceder a esta funcionalidad'
    });
  }

  try {
    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido',
      message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
    });
  }
};

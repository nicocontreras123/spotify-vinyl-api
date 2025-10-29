import { spotifyApi } from '../config/spotify.js';

/**
 * Middleware to authenticate requests using Bearer token from Authorization header
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'No access token provided. Please authenticate with Spotify first.'
    });
  }

  try {
    // Set the access token for this request
    spotifyApi.setAccessToken(token);
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided access token is invalid or expired.'
    });
  }
};

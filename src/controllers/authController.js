import { spotifyApi, scopes } from '../config/spotify.js';

// Store tokens temporarily (in production, use a database or session management)
let accessToken = null;
let refreshToken = null;

export const login = (req, res) => {
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'state');
  res.json({
    message: 'Please authorize the application',
    authUrl: authorizeURL
  });
};

export const callback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    accessToken = data.body['access_token'];
    refreshToken = data.body['refresh_token'];

    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    // Get frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Redirect to frontend with tokens in hash fragment (client-side only)
    const redirectUrl = `${frontendUrl}/#access_token=${accessToken}&refresh_token=${refreshToken}&expires_in=${data.body['expires_in']}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error during authentication:', error);

    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/#error=authentication_failed&message=${encodeURIComponent(error.message)}`);
  }
};

export const logout = (req, res) => {
  // Clear tokens
  accessToken = null;
  refreshToken = null;

  // Reset spotify API tokens
  spotifyApi.resetAccessToken();
  spotifyApi.resetRefreshToken();

  res.json({
    message: 'Logged out successfully'
  });
};

export const getAccessToken = () => accessToken;
export const isAuthenticated = () => !!accessToken;

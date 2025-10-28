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

    res.json({
      message: 'Authentication successful!',
      expiresIn: data.body['expires_in']
    });
  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(500).json({
      error: 'Authentication failed',
      details: error.message
    });
  }
};

export const getAccessToken = () => accessToken;
export const isAuthenticated = () => !!accessToken;

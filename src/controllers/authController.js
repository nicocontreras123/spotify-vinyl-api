import { spotifyApi, scopes } from '../config/spotify.js';

// Store tokens temporarily (in production, use a database or session management)
let accessToken = null;
let refreshToken = null;
let tokenExpiresAt = null;

/**
 * Renovar el token de acceso automáticamente si ha expirado
 */
export const ensureValidToken = async () => {
  try {
    // Si no hay token, no hay nada que renovar
    if (!accessToken || !refreshToken) {
      throw new Error('No tokens available. User needs to authenticate.');
    }

    // Verificar si el token ha expirado (con 5 min de margen)
    const now = Date.now();
    const expirationMargin = 5 * 60 * 1000; // 5 minutos

    if (tokenExpiresAt && now > (tokenExpiresAt - expirationMargin)) {
      console.log('🔄 Token expirado o próximo a expirar, renovando...');
      
      spotifyApi.setRefreshToken(refreshToken);
      const data = await spotifyApi.refreshAccessToken();
      
      accessToken = data.body['access_token'];
      tokenExpiresAt = now + (data.body['expires_in'] * 1000);
      
      spotifyApi.setAccessToken(accessToken);
      
      console.log('✅ Token renovado exitosamente');
      console.log(`⏱️ Nuevo token expirará en ${Math.round(data.body['expires_in'] / 60)} minutos`);
    }

    return accessToken;
  } catch (error) {
    console.error('❌ Error renovando token:', error.message);
    throw new Error('Failed to refresh token. Please log in again.');
  }
};

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
    
    // Calcular cuándo expira el token
    const expiresIn = data.body['expires_in'] || 3600; // 1 hora por defecto
    tokenExpiresAt = Date.now() + (expiresIn * 1000);

    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    console.log(`✅ Usuario autenticado. Token expirará en ${Math.round(expiresIn / 60)} minutos`);

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
  tokenExpiresAt = null;

  // Reset spotify API tokens
  spotifyApi.resetAccessToken();
  spotifyApi.resetRefreshToken();

  res.json({
    message: 'Logged out successfully'
  });
};

export const getAccessToken = () => accessToken;
export const isAuthenticated = () => !!accessToken;

import { getAnalysisData, getAlbumDetails, searchAlbums } from '../services/spotifyService.js';
import { generateVinylRecommendations, generateMusicTasteSummary } from '../services/vinylRecommendationService.js';
import { generateDiscoveryRecommendations, generateDiscoverySummary } from '../services/discoveryService.js';
import * as cache from '../services/cacheService.js';

export const getUserAnalysis = async (req, res) => {
  try {
    const analysisData = await getAnalysisData();
    res.json({
      success: true,
      data: analysisData
    });
  } catch (error) {
    console.error('Error getting user analysis:', error);

    // If it's an authentication error, return 401/403
    if (error.statusCode === 401 || error.statusCode === 403) {
      return res.status(error.statusCode).json({
        error: 'Error de autenticación',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Error al obtener datos del usuario',
      details: error.message
    });
  }
};

export const getVinylRecommendations = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'medium_term';
    const spotifyUserId = req.userId; // Spotify user ID (from authenticateToken middleware)
    const jwtUserId = req.user?.userId || null; // JWT user ID (optional, for owned/favorites)

    // Use Spotify user ID for caching (each Spotify account has its own cache)
    const cacheKey = cache.generateKey(`${spotifyUserId}:${timeRange}`, 'vinyl');

    // If user is logged in with JWT, don't use cache (because owned/favorites change)
    if (!jwtUserId) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log(`✨ Returning cached vinyl recommendations for Spotify user ${spotifyUserId}`);
        return res.json({
          ...cachedData,
          cached: true,
          cacheHit: true
        });
      }
    }

    // Cache miss or user has JWT login - generate fresh recommendations
    console.log(`🔄 Generating fresh vinyl recommendations for Spotify user ${spotifyUserId}`);
    const analysisData = await getAnalysisData(timeRange);
    const recommendations = await generateVinylRecommendations(analysisData, jwtUserId);
    const musicTasteSummary = generateMusicTasteSummary(analysisData);

    const responseData = {
      success: true,
      summary: musicTasteSummary,
      vinylRecommendations: recommendations,
      totalRecommendations: recommendations.length,
      timeRange: timeRange,
      cached: false
    };

    // Cache the result only if user doesn't have JWT login
    // (JWT users get personalized results that shouldn't be cached)
    if (!jwtUserId) {
      cache.set(cacheKey, responseData);
      console.log(`💾 Cached vinyl recommendations for Spotify user ${spotifyUserId}`);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error generating recommendations:', error);

    // If it's an authentication error, return 401/403
    if (error.statusCode === 401 || error.statusCode === 403) {
      return res.status(error.statusCode).json({
        error: 'Error de autenticación',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Error al generar recomendaciones de vinilos',
      details: error.message
    });
  }
};

export const getAlbumDetailsController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Solicitud incorrecta',
        message: 'Se requiere el ID del álbum'
      });
    }

    const albumDetails = await getAlbumDetails(id);

    res.json({
      success: true,
      data: albumDetails
    });
  } catch (error) {
    console.error('Error fetching album details:', error);

    // Handle specific Spotify API errors
    if (error.message.includes('invalid id')) {
      return res.status(404).json({
        error: 'Álbum no encontrado',
        message: 'El ID de álbum especificado no existe'
      });
    }

    res.status(500).json({
      error: 'Error al obtener detalles del álbum',
      details: error.message
    });
  }
};

/**
 * Get discovery recommendations - new artists similar to user's taste
 */
export const getDiscoveryRecommendations = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'medium_term';
    const spotifyUserId = req.userId; // Spotify user ID (from authenticateToken middleware)
    const jwtUserId = req.user?.userId || null; // JWT user ID (optional, for owned/favorites)

    // Use Spotify user ID for caching
    const cacheKey = cache.generateKey(`${spotifyUserId}:${timeRange}`, 'discovery');

    // If user is logged in with JWT, don't use cache (because owned/favorites change)
    if (!jwtUserId) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log(`✨ Returning cached discovery recommendations for Spotify user ${spotifyUserId}`);
        return res.json({
          ...cachedData,
          cached: true,
          cacheHit: true
        });
      }
    }

    console.log(`🎯 Generating fresh discovery recommendations for Spotify user ${spotifyUserId}`);
    const analysisData = await getAnalysisData(timeRange);
    const recommendations = await generateDiscoveryRecommendations(analysisData, jwtUserId);
    const summary = generateDiscoverySummary(recommendations);

    const responseData = {
      success: true,
      summary: summary,
      recommendations: recommendations,
      totalRecommendations: recommendations.length,
      timeRange: timeRange,
      message: 'Descubre discos basados en tus gustos musicales',
      cached: false
    };

    // Cache the result only if user doesn't have JWT login
    if (!jwtUserId) {
      cache.set(cacheKey, responseData);
      console.log(`💾 Cached discovery recommendations for Spotify user ${spotifyUserId}`);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error generating discovery recommendations:', error);

    // If it's an authentication error, return 401/403
    if (error.statusCode === 401 || error.statusCode === 403) {
      return res.status(error.statusCode).json({
        error: 'Error de autenticación',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Error al generar recomendaciones de descubrimiento',
      details: error.message
    });
  }
};

/**
 * Search albums in Spotify
 */
export const searchAlbumsController = async (req, res) => {
  try {
    const query = req.query.q || req.query.query;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Solicitud incorrecta',
        message: 'Se requiere un término de búsqueda'
      });
    }

    const albums = await searchAlbums(query, limit);

    res.json({
      success: true,
      query: query,
      results: albums,
      totalResults: albums.length
    });
  } catch (error) {
    console.error('Error searching albums:', error);

    // If it's an authentication error, return 401/403
    if (error.statusCode === 401 || error.statusCode === 403) {
      return res.status(error.statusCode).json({
        error: 'Error de autenticación',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Error al buscar álbumes',
      details: error.message
    });
  }
};

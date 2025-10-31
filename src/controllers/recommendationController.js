import { getAnalysisData, getAlbumDetails } from '../services/spotifyService.js';
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
    const userId = req.userId;

    // Try to get from cache if userId is available
    if (userId) {
      const cacheKey = cache.generateKey(userId, timeRange, 'vinyl');
      const cachedData = cache.get(cacheKey);

      if (cachedData) {
        console.log('✨ Returning cached vinyl recommendations');
        return res.json({
          ...cachedData,
          cached: true,
          cacheHit: true
        });
      }
    }

    // Cache miss or no userId - generate fresh recommendations
    console.log('🔄 Generating fresh vinyl recommendations');
    const analysisData = await getAnalysisData(timeRange);
    const recommendations = await generateVinylRecommendations(analysisData);
    const musicTasteSummary = generateMusicTasteSummary(analysisData);

    const responseData = {
      success: true,
      summary: musicTasteSummary,
      vinylRecommendations: recommendations,
      totalRecommendations: recommendations.length,
      timeRange: timeRange,
      cached: false
    };

    // Cache the result if userId is available
    if (userId) {
      const cacheKey = cache.generateKey(userId, timeRange, 'vinyl');
      cache.set(cacheKey, responseData);
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

    console.log('🎯 Generating discovery recommendations...');
    const analysisData = await getAnalysisData(timeRange);
    const recommendations = await generateDiscoveryRecommendations(analysisData);
    const summary = generateDiscoverySummary(recommendations);

    res.json({
      success: true,
      summary: summary,
      recommendations: recommendations,
      totalRecommendations: recommendations.length,
      timeRange: timeRange,
      message: 'Descubre discos basados en tus gustos musicales'
    });
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

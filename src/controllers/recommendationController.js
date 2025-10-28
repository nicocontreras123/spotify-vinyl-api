import { getAnalysisData, getAlbumDetails } from '../services/spotifyService.js';
import { generateVinylRecommendations, generateMusicTasteSummary } from '../services/vinylRecommendationService.js';
import { isAuthenticated } from './authController.js';

export const getUserAnalysis = async (req, res) => {
  if (!isAuthenticated()) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Please authenticate with Spotify first by visiting /auth/login'
    });
  }

  try {
    const analysisData = await getAnalysisData();
    res.json({
      success: true,
      data: analysisData
    });
  } catch (error) {
    console.error('Error getting user analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch user data',
      details: error.message
    });
  }
};

export const getVinylRecommendations = async (req, res) => {
  if (!isAuthenticated()) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Please authenticate with Spotify first by visiting /auth/login'
    });
  }

  try {
    const timeRange = req.query.timeRange || 'medium_term';
    const analysisData = await getAnalysisData(timeRange);
    const recommendations = await generateVinylRecommendations(analysisData);
    const musicTasteSummary = generateMusicTasteSummary(analysisData);

    res.json({
      success: true,
      summary: musicTasteSummary,
      vinylRecommendations: recommendations,
      totalRecommendations: recommendations.length,
      timeRange: timeRange
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate vinyl recommendations',
      details: error.message
    });
  }
};

export const getAlbumDetailsController = async (req, res) => {
  if (!isAuthenticated()) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Please authenticate with Spotify first by visiting /auth/login'
    });
  }

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Album ID is required'
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
        error: 'Album not found',
        message: 'The specified album ID does not exist'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch album details',
      details: error.message
    });
  }
};

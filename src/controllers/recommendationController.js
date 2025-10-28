import { getAnalysisData } from '../services/spotifyService.js';
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

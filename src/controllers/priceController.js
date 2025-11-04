import { searchVinylPrices, getCheapestPrice, comparePrices } from '../services/priceComparisonService.js';

/**
 * Search for vinyl prices across Chilean stores
 * GET /api/prices/search?artist=ARTIST&album=ALBUM
 */
export const searchPricesController = async (req, res) => {
  try {
    const { artist, album } = req.query;

    if (!artist || !album) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los parámetros "artist" y "album"',
      });
    }

    console.log(`🔍 Searching prices for: ${artist} - ${album}`);

    const priceData = await searchVinylPrices(artist, album);

    res.json({
      success: true,
      data: priceData,
    });
  } catch (error) {
    console.error('Error searching vinyl prices:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar precios',
      details: error.message,
    });
  }
};

/**
 * Get the cheapest price for a vinyl
 * GET /api/prices/cheapest?artist=ARTIST&album=ALBUM
 */
export const getCheapestPriceController = async (req, res) => {
  try {
    const { artist, album } = req.query;

    if (!artist || !album) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los parámetros "artist" y "album"',
      });
    }

    const cheapest = await getCheapestPrice(artist, album);

    if (!cheapest) {
      return res.json({
        success: true,
        data: null,
        message: 'No se encontraron resultados para este vinilo',
      });
    }

    res.json({
      success: true,
      data: cheapest,
    });
  } catch (error) {
    console.error('Error getting cheapest price:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el precio más barato',
      details: error.message,
    });
  }
};

/**
 * Compare prices between stores
 * GET /api/prices/compare?artist=ARTIST&album=ALBUM
 */
export const comparePricesController = async (req, res) => {
  try {
    const { artist, album } = req.query;

    if (!artist || !album) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los parámetros "artist" y "album"',
      });
    }

    const comparison = await comparePrices(artist, album);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Error comparing prices:', error);
    res.status(500).json({
      success: false,
      error: 'Error al comparar precios',
      details: error.message,
    });
  }
};

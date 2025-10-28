import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const DISCOGS_API_URL = 'https://api.discogs.com';
const USER_AGENT = 'SpotifyVinylRecommender/1.0';
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN || null;

// Tasa de conversión aproximada USD a CLP (actualizar periódicamente)
// Idealmente esto debería venir de una API de tipos de cambio
const USD_TO_CLP = 950;

// Rate limiting: delay between requests (in ms)
const REQUEST_DELAY = 1100; // ~50 requests per minute with token, 20 without

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Queue to handle rate limiting
let lastRequestTime = 0;

/**
 * Helper to make rate-limited requests
 */
const makeRateLimitedRequest = async (url, params = {}) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY) {
    await delay(REQUEST_DELAY - timeSinceLastRequest);
  }

  const headers = {
    'User-Agent': USER_AGENT
  };

  // Add token if available
  if (DISCOGS_TOKEN) {
    headers['Authorization'] = `Discogs token=${DISCOGS_TOKEN}`;
  }

  lastRequestTime = Date.now();

  return axios.get(url, {
    params,
    headers,
    timeout: 5000 // 5 second timeout
  });
};

/**
 * Busca un vinilo en Discogs y obtiene información de precios
 */
export const searchVinylPrice = async (artist, album) => {
  // If no token and we want to avoid rate limits, skip
  if (!DISCOGS_TOKEN) {
    console.log('Discogs token not configured, skipping price fetch');
    return {
      found: false,
      priceUSD: null,
      priceCLP: null
    };
  }

  try {
    const searchQuery = `${artist} ${album}`;
    const response = await makeRateLimitedRequest(`${DISCOGS_API_URL}/database/search`, {
      q: searchQuery,
      type: 'release',
      format: 'vinyl',
      per_page: 5
    });

    if (response.data.results && response.data.results.length > 0) {
      const release = response.data.results[0];

      // Intentar obtener precio del marketplace
      const priceInfo = await getMarketplacePrice(release.id);

      return {
        found: true,
        discogsId: release.id,
        title: release.title,
        year: release.year,
        thumb: release.thumb,
        ...priceInfo
      };
    }

    return {
      found: false,
      priceUSD: null,
      priceCLP: null
    };
  } catch (error) {
    console.error('Error searching Discogs:', error.message);
    return {
      found: false,
      priceUSD: null,
      priceCLP: null,
      error: error.message
    };
  }
};

/**
 * Obtiene estadísticas de precio del marketplace de Discogs
 */
const getMarketplacePrice = async (releaseId) => {
  try {
    const response = await makeRateLimitedRequest(`${DISCOGS_API_URL}/marketplace/stats/${releaseId}`, {
      curr_abbr: 'USD'
    });

    if (response.data) {
      const stats = response.data;
      const lowestPrice = stats.lowest_price?.value || null;
      const medianPrice = stats.lowest_price?.value || null;

      if (lowestPrice) {
        return {
          priceUSD: {
            lowest: lowestPrice,
            currency: 'USD'
          },
          priceCLP: {
            lowest: Math.round(lowestPrice * USD_TO_CLP),
            currency: 'CLP'
          },
          numForSale: stats.num_for_sale || 0
        };
      }
    }

    return {
      priceUSD: null,
      priceCLP: null,
      numForSale: 0
    };
  } catch (error) {
    // Si no hay stats disponibles, no es crítico
    console.log(`No marketplace stats for release ${releaseId}`);
    return {
      priceUSD: null,
      priceCLP: null,
      numForSale: 0
    };
  }
};

/**
 * Obtiene el tipo de cambio actual USD a CLP
 */
export const getExchangeRate = async () => {
  try {
    // Usar una API gratuita de tipos de cambio
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    if (response.data && response.data.rates && response.data.rates.CLP) {
      return response.data.rates.CLP;
    }
    return USD_TO_CLP; // Fallback
  } catch (error) {
    console.error('Error fetching exchange rate:', error.message);
    return USD_TO_CLP; // Fallback
  }
};

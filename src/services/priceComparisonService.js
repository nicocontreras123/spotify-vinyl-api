import axios from 'axios';
import * as cacheService from './cacheService.js';

// Cache TTL for price data: 6 hours (prices change frequently)
const PRICE_CACHE_TTL = 6 * 60 * 60;

/**
 * Search for vinyl prices across Chilean stores
 * @param {string} artist - Artist name
 * @param {string} album - Album name
 * @returns {Promise<Object>} Price comparison results
 */
export const searchVinylPrices = async (artist, album) => {
  const cacheKey = cacheService.generateKey(`prices:${artist}:${album}`, 'prices');
  const cachedData = cacheService.get(cacheKey);

  if (cachedData) {
    console.log(`📦 Using cached prices for: ${artist} - ${album}`);
    return cachedData;
  }

  console.log(`💰 Searching prices for: ${artist} - ${album}`);

  // Search in parallel across all stores
  const searchPromises = [
    searchMercadoLibre(artist, album),
    // TODO: Add more stores
    // searchNeedle(artist, album),
    // searchPuntoMusical(artist, album),
  ];

  const results = await Promise.allSettled(searchPromises);

  // Combine all results
  const allPrices = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allPrices.push(...result.value);
    }
  });

  // Sort by price (lowest first)
  allPrices.sort((a, b) => a.price - b.price);

  const priceData = {
    artist,
    album,
    results: allPrices,
    cheapest: allPrices.length > 0 ? allPrices[0] : null,
    totalResults: allPrices.length,
    lastUpdated: new Date().toISOString(),
  };

  // Cache the results
  cacheService.set(cacheKey, priceData, PRICE_CACHE_TTL);

  return priceData;
};

/**
 * Search Mercado Libre Chile for vinyl prices
 * Uses Mercado Libre public API
 */
const searchMercadoLibre = async (artist, album) => {
  try {
    const query = `${artist} ${album} vinilo`.trim();
    const url = `https://api.mercadolibre.com/sites/MLC/search`;

    const response = await axios.get(url, {
      params: {
        q: query,
        category: 'MLC1182', // Música, Películas y Series > Música category
        limit: 10,
        offset: 0,
      },
      timeout: 10000,
    });

    if (!response.data || !response.data.results) {
      return [];
    }

    // Filter and format results
    const results = response.data.results
      .filter(item => {
        // Filter out items that are clearly not vinyl records
        const title = item.title.toLowerCase();
        return (
          (title.includes('vinilo') || title.includes('lp') || title.includes('vinyl')) &&
          !title.includes('cd') &&
          !title.includes('digital') &&
          !title.includes('póster') &&
          !title.includes('poster')
        );
      })
      .map(item => ({
        store: 'Mercado Libre',
        title: item.title,
        price: Math.round(item.price),
        currency: item.currency_id,
        condition: item.condition === 'new' ? 'Nuevo' : 'Usado',
        url: item.permalink,
        thumbnail: item.thumbnail,
        seller: {
          name: item.seller?.nickname || 'Vendedor',
          reputation: item.seller?.seller_reputation?.level_id || null,
        },
        shipping: item.shipping?.free_shipping ? 'Envío gratis' : 'Envío con costo',
        available_quantity: item.available_quantity,
      }));

    console.log(`  🛒 Mercado Libre: Found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Error searching Mercado Libre:', error.message);
    return [];
  }
};

/**
 * Search Needle store (placeholder for future implementation)
 * Needle doesn't have a public API, would require web scraping
 */
const searchNeedle = async (artist, album) => {
  // TODO: Implement web scraping for Needle store
  // https://needlemusica.cl
  console.log('  📍 Needle: Not implemented yet (requires web scraping)');
  return [];
};

/**
 * Search Punto Musical (placeholder for future implementation)
 * Would require web scraping or contacting them for API access
 */
const searchPuntoMusical = async (artist, album) => {
  // TODO: Implement web scraping for Punto Musical
  console.log('  🎵 Punto Musical: Not implemented yet (requires web scraping)');
  return [];
};

/**
 * Get the cheapest price for a vinyl across all stores
 */
export const getCheapestPrice = async (artist, album) => {
  const priceData = await searchVinylPrices(artist, album);
  return priceData.cheapest;
};

/**
 * Compare prices between stores for a specific vinyl
 */
export const comparePrices = async (artist, album) => {
  const priceData = await searchVinylPrices(artist, album);

  // Group by store
  const byStore = {};
  priceData.results.forEach(result => {
    if (!byStore[result.store]) {
      byStore[result.store] = [];
    }
    byStore[result.store].push(result);
  });

  return {
    artist,
    album,
    byStore,
    cheapest: priceData.cheapest,
    totalResults: priceData.totalResults,
  };
};

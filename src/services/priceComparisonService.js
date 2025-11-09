import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleSearch } from 'google-search-results-nodejs';
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

  // Search in parallel across all sources
  const searchPromises = [
    searchGoogleShopping(artist, album),
    searchMercadoLibre(artist, album),
    // TODO: Add more stores if needed
  ];

  const results = await Promise.allSettled(searchPromises);

  // Combine all results
  const allPrices = [];
  results.forEach((result, index) => {
    console.log(`  📊 Promise ${index} status:`, result.status);
    if (result.status === 'fulfilled') {
      console.log(`  ✅ Promise ${index} returned ${result.value.length} results`);
      if (result.value.length > 0) {
        allPrices.push(...result.value);
      }
    } else {
      console.log(`  ❌ Promise ${index} failed:`, result.reason?.message || result.reason);
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
 * Search Google Shopping using SerpAPI
 * Falls back to search link if API key is not configured
 */
const searchGoogleShopping = async (artist, album) => {
  const cleanQuery = `${artist} ${album} vinilo chile`.trim();
  const googleShoppingUrl = `https://www.google.cl/search?q=${encodeURIComponent(cleanQuery)}&tbm=shop`;

  // Check if SerpAPI key is configured
  const serpApiKey = process.env.SERPAPI_KEY;

  if (!serpApiKey || serpApiKey === 'your_serpapi_key_here') {
    console.log(`  ⚠️ SerpAPI key not configured - returning search link`);
    console.log(`  💡 To get real prices, sign up at https://serpapi.com (free 100 searches/month)`);
    console.log(`  💡 Add SERPAPI_KEY to your .env file`);

    return [{
      store: 'Google Shopping',
      title: `${artist} - ${album} (Buscar Vinilo)`,
      price: 0,
      currency: 'CLP',
      condition: 'Buscar precios',
      url: googleShoppingUrl,
      thumbnail: null,
      shipping: 'Ver en Google',
      available_quantity: null,
      isSearchLink: true,
    }];
  }

  try {
    console.log(`  🔍 Searching Google Shopping via SerpAPI for: "${artist} - ${album}"`);

    // Use SerpAPI to get Google Shopping results
    const search = new GoogleSearch(serpApiKey);
    const searchResults = await new Promise((resolve, reject) => {
      search.json({
        engine: 'google_shopping',
        q: cleanQuery,
        location: 'Chile',
        hl: 'es',
        gl: 'cl',
        num: 10,
      }, (data) => {
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
      });
    });

    const results = [];

    if (searchResults.shopping_results && searchResults.shopping_results.length > 0) {
      console.log(`  📊 SerpAPI found ${searchResults.shopping_results.length} products`);

      searchResults.shopping_results.slice(0, 10).forEach((product) => {
        // Filter out non-vinyl products
        const title = product.title?.toLowerCase() || '';

        // Must contain vinyl-related keywords
        const isVinyl = title.includes('vinilo') ||
                       title.includes('vinyl') ||
                       title.includes('lp') ||
                       title.includes('disco');

        // Must NOT contain CD-related keywords
        const isNotCD = !title.includes(' cd ') &&
                       !title.includes('cd,') &&
                       !title.includes('cd-') &&
                       !title.includes('(cd)') &&
                       !title.includes('[cd]') &&
                       !title.includes('compact disc') &&
                       !title.includes('digital') &&
                       !title.includes('mp3') &&
                       !title.includes('cassette') &&
                       !title.includes('casete');

        // Skip if it's not vinyl or if it's a CD
        if (!isVinyl || !isNotCD) {
          console.log(`    ⏭️  Filtered out: ${product.title} (not vinyl or is CD)`);
          return;
        }

        // Extract price
        let price = null;
        if (product.extracted_price) {
          price = Math.round(product.extracted_price);
        } else if (product.price) {
          // Try to extract numeric value
          const priceMatch = product.price.toString().match(/[\d.,]+/);
          if (priceMatch) {
            price = Math.round(parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.')));
          }
        }

        // Extract URL - SerpAPI uses 'link' or 'product_link'
        const productUrl = product.link || product.product_link || product.url;

        // Only add products with valid price and URL
        if (price && price > 0 && productUrl) {
          results.push({
            store: product.source || 'Tienda Online',
            title: product.title,
            price: price,
            currency: 'CLP',
            condition: product.condition || 'Ver en tienda',
            url: productUrl,
            thumbnail: product.thumbnail,
            shipping: product.delivery || 'Consultar en tienda',
            available_quantity: 1,
          });
        }
      });

      if (results.length > 0) {
        console.log(`  ✅ Found ${results.length} products with prices`);
        console.log(`    First result: ${results[0].title} - $${results[0].price.toLocaleString('es-CL')}`);
        return results;
      }
    }

    // No results found
    console.log(`  ⚠️ No products found via SerpAPI`);
    return [{
      store: 'Google Shopping',
      title: `${artist} - ${album} (Buscar Vinilo)`,
      price: 0,
      currency: 'CLP',
      condition: 'Buscar precios',
      url: googleShoppingUrl,
      thumbnail: null,
      shipping: 'Ver en Google',
      available_quantity: null,
      isSearchLink: true,
    }];
  } catch (error) {
    console.error('  ❌ SerpAPI error:', error.message);

    // Fallback to search link
    return [{
      store: 'Google Shopping',
      title: `${artist} - ${album} (Buscar Vinilo)`,
      price: 0,
      currency: 'CLP',
      condition: 'Buscar precios',
      url: googleShoppingUrl,
      thumbnail: null,
      shipping: 'Ver en Google',
      available_quantity: null,
      isSearchLink: true,
    }];
  }
};

/**
 * Search Mercado Libre Chile for vinyl prices
 * Uses Mercado Libre public API
 */
const searchMercadoLibre = async (artist, album) => {
  try {
    const query = `${artist} ${album} vinilo`.trim();
    const url = `https://api.mercadolibre.com/sites/MLC/search`;

    console.log(`  🔍 Searching Mercado Libre with query: "${query}"`);

    const response = await axios.get(url, {
      params: {
        q: query,
        limit: 20,
        offset: 0,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'es-CL,es;q=0.9',
      },
      timeout: 15000,
    });

    if (!response.data || !response.data.results) {
      console.log('  ⚠️ Mercado Libre: No response data');
      return [];
    }

    console.log(`  📊 Mercado Libre: API returned ${response.data.results.length} total results`);

    // Filter and format results - Less strict filtering
    const results = response.data.results
      .filter(item => {
        // Filter out items that are clearly not vinyl records
        const title = item.title.toLowerCase();
        const isVinyl = title.includes('vinilo') || title.includes('lp') || title.includes('vinyl');
        const isNotOther = !title.includes('cd') && !title.includes('digital');

        if (!isVinyl) {
          console.log(`    ❌ Filtered out (not vinyl): ${item.title.substring(0, 50)}...`);
        }

        return isVinyl && isNotOther;
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

    console.log(`  ✅ Mercado Libre: Found ${results.length} vinyl results after filtering`);

    if (results.length > 0) {
      console.log(`    First result: ${results[0].title} - $${results[0].price}`);
    }

    return results;
  } catch (error) {
    console.error('  ❌ Error searching Mercado Libre:', error.message);

    // If it's a 403 error, log additional info
    if (error.response && error.response.status === 403) {
      console.error('  🚫 Mercado Libre returned 403 - Access Forbidden');
      console.error('  💡 This might be due to:');
      console.error('     - Rate limiting');
      console.error('     - IP blocking');
      console.error('     - Need for API credentials');
      console.error('  💡 Consider:');
      console.error('     - Registering for Mercado Libre API credentials');
      console.error('     - Using a proxy service');
      console.error('     - Implementing direct web scraping of Chilean vinyl stores');
    }

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

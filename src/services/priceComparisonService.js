import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleSearch } from 'google-search-results-nodejs';
import * as cacheService from './cacheService.js';

// Cache TTL for price data: 6 hours (prices change frequently)
const PRICE_CACHE_TTL = 6 * 60 * 60;

// Text normalization utilities for better matching
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

// Calculate similarity score between two strings (0-100)
const calculateSimilarity = (str1, str2) => {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 100;

  const words1 = s1.split(' ');
  const words2 = s2.split(' ');

  let matchCount = 0;
  words1.forEach(word => {
    if (word.length > 2 && words2.some(w => w.includes(word) || word.includes(w))) {
      matchCount++;
    }
  });

  const totalWords = Math.max(words1.length, words2.length);
  return totalWords > 0 ? Math.round((matchCount / totalWords) * 100) : 0;
};

// Check if title is relevant to artist and album
const isRelevantResult = (title, artist, album) => {
  const normalizedTitle = normalizeText(title);
  const normalizedArtist = normalizeText(artist);
  const normalizedAlbum = normalizeText(album);

  const artistScore = calculateSimilarity(normalizedTitle, normalizedArtist);
  const albumScore = calculateSimilarity(normalizedTitle, normalizedAlbum);

  // Combined score: both artist and album should have some presence
  const combinedScore = (artistScore * 0.4) + (albumScore * 0.6);

  return {
    score: combinedScore,
    isRelevant: combinedScore >= 30, // At least 30% match
    artistScore,
    albumScore
  };
};

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
    searchNeedleMusica(artist, album),
    searchDiscocentro(artist, album),
  ];

  const results = await Promise.allSettled(searchPromises);

  // Combine all results with relevance scoring
  const allPrices = [];
  results.forEach((result, index) => {
    console.log(`  📊 Promise ${index} status:`, result.status);
    if (result.status === 'fulfilled') {
      console.log(`  ✅ Promise ${index} returned ${result.value.length} results`);
      if (result.value.length > 0) {
        // Add relevance scoring to each result
        const scoredResults = result.value.map(item => {
          if (item.isSearchLink) return item; // Skip search links

          const relevance = isRelevantResult(item.title, artist, album);
          return {
            ...item,
            relevanceScore: relevance.score,
            artistMatchScore: relevance.artistScore,
            albumMatchScore: relevance.albumScore,
          };
        });

        // Filter by relevance (keep only relevant results)
        const relevantResults = scoredResults.filter(item =>
          item.isSearchLink || item.relevanceScore >= 30
        );

        console.log(`    Filtered from ${scoredResults.length} to ${relevantResults.length} relevant results`);
        allPrices.push(...relevantResults);
      }
    } else {
      console.log(`  ❌ Promise ${index} failed:`, result.reason?.message || result.reason);
    }
  });

  // Sort by relevance score first, then by price
  allPrices.sort((a, b) => {
    // Search links go last
    if (a.isSearchLink && !b.isSearchLink) return 1;
    if (!a.isSearchLink && b.isSearchLink) return -1;
    if (a.isSearchLink && b.isSearchLink) return 0;

    // Sort by relevance score (higher first)
    const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    if (Math.abs(scoreDiff) > 10) return scoreDiff;

    // If similar relevance, sort by price (lower first)
    return a.price - b.price;
  });

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
  // Generate multiple search variants for better coverage
  const searchVariants = [
    `${artist} ${album} vinilo`,
    `${artist} ${album} vinyl lp`,
    `${artist} ${album} disco vinilo`,
  ];

  const cleanQuery = searchVariants[0] + ' chile';
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

    // Filter and format results with better vinyl detection
    const results = response.data.results
      .filter(item => {
        const title = item.title.toLowerCase();

        // Must be vinyl-related
        const isVinyl = title.includes('vinilo') ||
                       title.includes('vinyl') ||
                       title.includes(' lp ') ||
                       title.includes('disco de vinilo') ||
                       title.includes('disco vinilo');

        // Must NOT be CD, digital, or other formats
        const isNotOther = !title.includes(' cd ') &&
                          !title.includes('(cd)') &&
                          !title.includes('[cd]') &&
                          !title.includes('cd,') &&
                          !title.includes('cd-') &&
                          !title.includes('digital') &&
                          !title.includes('mp3') &&
                          !title.includes('cassette') &&
                          !title.includes('dvd') &&
                          !title.includes('blu-ray') &&
                          !title.includes('posters') &&
                          !title.includes('libro');

        // Filter out accessories (unless the album name contains these words)
        const normalizedAlbum = normalizeText(album);
        const isAccessory = (title.includes('aguja') ||
                           title.includes('capsula') ||
                           title.includes('tornamesa') ||
                           title.includes('tocadisco') ||
                           title.includes('bandeja')) &&
                          !normalizedAlbum.includes('aguja') &&
                          !normalizedAlbum.includes('capsula');

        if (!isVinyl) {
          console.log(`    ⏭️  Not vinyl: ${item.title.substring(0, 60)}`);
          return false;
        }

        if (!isNotOther) {
          console.log(`    ⏭️  Is CD/Digital: ${item.title.substring(0, 60)}`);
          return false;
        }

        if (isAccessory) {
          console.log(`    ⏭️  Is accessory: ${item.title.substring(0, 60)}`);
          return false;
        }

        return true;
      })
      .slice(0, 15) // Limit to top 15 results
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
 * Search Needle Música (Chilean vinyl store)
 * Uses web scraping of their search results
 */
const searchNeedleMusica = async (artist, album) => {
  try {
    const query = `${artist} ${album}`.trim();
    const searchUrl = `https://needlemusica.cl/search?q=${encodeURIComponent(query)}`;

    console.log(`  🎵 Searching Needle Música: "${query}"`);

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://needlemusica.cl/',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Find product cards in search results
    $('.product-card, .product-item, .grid-product, .product').each((i, element) => {
      try {
        const $product = $(element);

        // Extract product title
        const title = $product.find('.product-card__title, .product-title, h3, h4, a[href*="/products/"]').first().text().trim();

        // Skip if no title
        if (!title) return;

        // Check if it's a vinyl
        const titleLower = title.toLowerCase();
        const isVinyl = titleLower.includes('vinilo') ||
                       titleLower.includes('vinyl') ||
                       titleLower.includes('lp') ||
                       titleLower.includes('disco');

        if (!isVinyl) return;

        // Extract price
        let price = null;
        const priceText = $product.find('.price, .product-price, .money, [class*="price"]').first().text();
        const priceMatch = priceText.match(/[\d.,]+/);
        if (priceMatch) {
          price = Math.round(parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.')));
        }

        // Extract URL
        const relativeUrl = $product.find('a[href*="/products/"]').first().attr('href');
        const url = relativeUrl ? `https://needlemusica.cl${relativeUrl}` : searchUrl;

        // Extract image
        const thumbnail = $product.find('img').first().attr('src') || $product.find('img').first().attr('data-src');

        // Only add if has valid price
        if (price && price > 0) {
          results.push({
            store: 'Needle Música',
            title: title,
            price: price,
            currency: 'CLP',
            condition: 'Nuevo',
            url: url,
            thumbnail: thumbnail,
            shipping: 'Consultar en tienda',
            available_quantity: 1,
          });
        }
      } catch (err) {
        console.log(`    ⚠️ Error parsing product:`, err.message);
      }
    });

    console.log(`  ✅ Needle Música: Found ${results.length} vinyls`);
    return results;
  } catch (error) {
    console.error('  ❌ Error searching Needle Música:', error.message);
    return [];
  }
};

/**
 * Search Discocentro (Chilean vinyl store)
 * Uses web scraping of their search results
 */
const searchDiscocentro = async (artist, album) => {
  try {
    const query = `${artist} ${album} vinilo`.trim();
    const searchUrl = `https://www.discocentro.cl/catalogsearch/result/?q=${encodeURIComponent(query)}`;

    console.log(`  💿 Searching Discocentro: "${query}"`);

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
        'Referer': 'https://www.discocentro.cl/',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Find product items in search results
    $('.product-item, .item.product, .product').each((i, element) => {
      try {
        const $product = $(element);

        // Extract product title
        const title = $product.find('.product-item-name, .product-name, h2, h3, a.product-item-link').first().text().trim();

        // Skip if no title
        if (!title) return;

        // Check if it's a vinyl (Discocentro includes format in title)
        const titleLower = title.toLowerCase();
        const isVinyl = titleLower.includes('vinilo') ||
                       titleLower.includes('vinyl') ||
                       titleLower.includes('lp') ||
                       titleLower.includes('180g') ||
                       titleLower.includes('12"') ||
                       titleLower.includes('disco');

        // Filter out CDs
        const isNotCD = !titleLower.includes(' cd ') &&
                       !titleLower.includes('(cd)') &&
                       !titleLower.includes('[cd]');

        if (!isVinyl || !isNotCD) return;

        // Extract price
        let price = null;
        const priceElement = $product.find('.price, .price-wrapper, [data-price-type="finalPrice"]');
        const priceText = priceElement.text();
        const priceMatch = priceText.match(/[\d.,]+/);
        if (priceMatch) {
          price = Math.round(parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.')));
        }

        // Extract URL
        const url = $product.find('a.product-item-link, a[href*="/producto/"]').first().attr('href');

        // Extract image
        const thumbnail = $product.find('img.product-image-photo, img').first().attr('src') ||
                         $product.find('img').first().attr('data-src');

        // Extract condition (if available)
        const conditionText = $product.find('.condition, .product-condition').text().toLowerCase();
        const condition = conditionText.includes('usado') ? 'Usado' : 'Nuevo';

        // Only add if has valid price and URL
        if (price && price > 0 && url) {
          results.push({
            store: 'Discocentro',
            title: title,
            price: price,
            currency: 'CLP',
            condition: condition,
            url: url.startsWith('http') ? url : `https://www.discocentro.cl${url}`,
            thumbnail: thumbnail,
            shipping: 'Consultar en tienda',
            available_quantity: 1,
          });
        }
      } catch (err) {
        console.log(`    ⚠️ Error parsing product:`, err.message);
      }
    });

    console.log(`  ✅ Discocentro: Found ${results.length} vinyls`);
    return results;
  } catch (error) {
    console.error('  ❌ Error searching Discocentro:', error.message);
    return [];
  }
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

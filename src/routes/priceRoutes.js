import express from 'express';
import { searchPricesController, getCheapestPriceController, comparePricesController } from '../controllers/priceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { searchVinylPrices } from '../services/priceComparisonService.js';

const router = express.Router();

// TEST ENDPOINT - Direct SerpAPI test, no cache, no auth
router.get('/test', async (req, res) => {
  try {
    const { artist = 'Pink Floyd', album = 'The Wall' } = req.query;

    console.log(`\n🧪 TEST ENDPOINT - Direct SerpAPI test`);
    console.log(`  Artist: ${artist}`);
    console.log(`  Album: ${album}`);
    console.log(`  SERPAPI_KEY exists: ${!!process.env.SERPAPI_KEY}`);
    console.log(`  SERPAPI_KEY length: ${process.env.SERPAPI_KEY?.length || 0}`);

    const cleanQuery = `${artist} ${album} vinilo chile`.trim();
    const serpApiKey = process.env.SERPAPI_KEY;

    if (!serpApiKey || serpApiKey === 'your_serpapi_key_here') {
      console.log(`  ❌ SerpAPI key not configured`);
      return res.json({
        success: false,
        test: true,
        error: 'SerpAPI key not configured',
        message: 'Add SERPAPI_KEY to your .env file'
      });
    }

    console.log(`  🔍 Calling SerpAPI with query: "${cleanQuery}"`);

    // Import SerpAPI - it's a CommonJS module
    const SerpApiModule = await import('google-search-results-nodejs');
    const GoogleSearch = SerpApiModule.GoogleSearch;
    const search = new GoogleSearch(serpApiKey);

    // Call SerpAPI directly using promise wrapper
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

    console.log(`  ✅ SerpAPI Response received`);
    console.log(`  📊 Shopping results count: ${searchResults.shopping_results?.length || 0}`);

    const results = [];
    if (searchResults.shopping_results && searchResults.shopping_results.length > 0) {
      searchResults.shopping_results.slice(0, 20).forEach((product, index) => {
        console.log(`  📦 Product ${index + 1}: ${product.title} - ${product.price || 'N/A'}`);

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
          console.log(`    ⏭️  Filtered: ${product.title}`);
          return;
        }

        // Extract price
        let price = null;
        if (product.extracted_price) {
          price = Math.round(product.extracted_price);
        } else if (product.price) {
          const priceMatch = product.price.toString().match(/[\d.,]+/);
          if (priceMatch) {
            price = Math.round(parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.')));
          }
        }

        // Extract URL - SerpAPI uses 'link' or 'product_link'
        const productUrl = product.link || product.product_link || product.url;

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
    }

    console.log(`  ✅ Processed ${results.length} products with valid prices`);

    res.json({
      success: true,
      test: true,
      data: {
        artist,
        album,
        results,
        totalResults: results.length,
        rawSerpApiResults: searchResults.shopping_results?.length || 0,
      },
      serpApiConfigured: true,
      message: `Found ${results.length} products. Check server logs for details.`
    });
  } catch (error) {
    console.error(`  ❌ TEST ENDPOINT - Error:`, error);
    res.status(500).json({
      success: false,
      test: true,
      error: error.message,
      stack: error.stack
    });
  }
});

// All price routes require Spotify authentication
// Price search routes
router.get('/search', authenticateToken, searchPricesController);
router.get('/cheapest', authenticateToken, getCheapestPriceController);
router.get('/compare', authenticateToken, comparePricesController);

export default router;

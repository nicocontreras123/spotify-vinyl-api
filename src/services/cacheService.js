import NodeCache from 'node-cache';

// Cache TTL: 24 hours (86400 seconds)
const CACHE_TTL = 24 * 60 * 60;

// Create cache instance
const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false // Better performance, but be careful with mutations
});

/**
 * Generate a cache key for recommendations
 * @param {string} key - Cache key identifier
 * @param {string} type - Type of cache (vinyl, discovery, spotify, discogs)
 * @returns {string} Cache key
 */
export const generateKey = (key, type = 'general') => {
  return `${type}:${key}`;
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if not found
 */
export const get = (key) => {
  try {
    const value = cache.get(key);
    if (value !== undefined) {
      console.log(`[Cache HIT] ${key}`);
      return value;
    }
    console.log(`[Cache MISS] ${key}`);
    return null;
  } catch (error) {
    console.error('[Cache Error] Error retrieving from cache:', error);
    return null;
  }
};

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Optional TTL in seconds (defaults to 24 hours)
 * @returns {boolean} Success status
 */
export const set = (key, value, ttl = CACHE_TTL) => {
  try {
    const success = cache.set(key, value, ttl);
    if (success) {
      console.log(`[Cache SET] ${key} (TTL: ${ttl}s)`);
    }
    return success;
  } catch (error) {
    console.error('[Cache Error] Error setting cache:', error);
    return false;
  }
};

/**
 * Delete cached data
 * @param {string} key - Cache key
 * @returns {number} Number of deleted entries
 */
export const del = (key) => {
  try {
    const deleted = cache.del(key);
    console.log(`[Cache DEL] ${key} (${deleted} entries deleted)`);
    return deleted;
  } catch (error) {
    console.error('[Cache Error] Error deleting from cache:', error);
    return 0;
  }
};

/**
 * Clear all user's cached recommendations
 * @param {string} userId - Spotify user ID
 * @returns {number} Number of deleted entries
 */
export const clearUserCache = (userId) => {
  try {
    const keys = cache.keys();
    const userKeys = keys.filter(key => key.includes(`:${userId}:`));
    const deleted = cache.del(userKeys);
    console.log(`[Cache CLEAR] Cleared ${deleted} entries for user ${userId}`);
    return deleted;
  } catch (error) {
    console.error('[Cache Error] Error clearing user cache:', error);
    return 0;
  }
};

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
export const getStats = () => {
  return cache.getStats();
};

/**
 * Clear all cache
 */
export const flush = () => {
  cache.flushAll();
  console.log('[Cache FLUSH] All cache cleared');
};

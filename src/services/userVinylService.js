import pool from '../config/database.js';

/**
 * Mark an album as owned by the user
 * @param {number} userId - User ID
 * @param {string} albumId - Album ID
 * @param {string} albumName - Album name
 * @param {string} artist - Artist name
 * @param {string} coverImage - Album cover image URL
 * @returns {Promise<object>} Created record
 */
export const markAlbumAsOwned = async (userId, albumId, albumName, artist, coverImage = null) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `INSERT INTO user_vinyls (user_id, album_id, album_name, artist, cover_image)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, album_id) DO NOTHING
       RETURNING id, marked_at`,
      [userId, albumId, albumName, artist, coverImage]
    );

    if (result.rows.length === 0) {
      // Album already marked
      return { alreadyMarked: true };
    }

    return {
      success: true,
      markedAt: result.rows[0].marked_at,
    };
  } finally {
    client.release();
  }
};

/**
 * Unmark an album as owned
 * @param {number} userId - User ID
 * @param {string} albumId - Album ID
 * @returns {Promise<object>} Result
 */
export const unmarkAlbumAsOwned = async (userId, albumId) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'DELETE FROM user_vinyls WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]
    );

    return {
      success: true,
      removed: result.rowCount > 0,
    };
  } finally {
    client.release();
  }
};

/**
 * Mark an album as favorite
 * @param {number} userId - User ID
 * @param {string} albumId - Album ID
 * @param {string} albumName - Album name
 * @param {string} artist - Artist name
 * @param {string} coverImage - Album cover image URL
 * @returns {Promise<object>} Created record
 */
export const markAlbumAsFavorite = async (userId, albumId, albumName, artist, coverImage = null) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `INSERT INTO user_favorites (user_id, album_id, album_name, artist, cover_image)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, album_id) DO NOTHING
       RETURNING id, marked_at`,
      [userId, albumId, albumName, artist, coverImage]
    );

    if (result.rows.length === 0) {
      // Album already marked as favorite
      return { alreadyMarked: true };
    }

    return {
      success: true,
      markedAt: result.rows[0].marked_at,
    };
  } finally {
    client.release();
  }
};

/**
 * Unmark an album as favorite
 * @param {number} userId - User ID
 * @param {string} albumId - Album ID
 * @returns {Promise<object>} Result
 */
export const unmarkAlbumAsFavorite = async (userId, albumId) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND album_id = $2',
      [userId, albumId]
    );

    return {
      success: true,
      removed: result.rowCount > 0,
    };
  } finally {
    client.release();
  }
};

/**
 * Get all owned albums for a user
 * @param {number} userId - User ID
 * @returns {Promise<array>} List of owned albums with details
 */
export const getUserOwnedAlbums = async (userId) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT album_id, album_name, artist, cover_image, marked_at FROM user_vinyls WHERE user_id = $1 ORDER BY marked_at DESC',
      [userId]
    );

    return result.rows.map(row => ({
      albumId: row.album_id,
      albumName: row.album_name,
      artist: row.artist,
      coverImage: row.cover_image,
      markedAt: row.marked_at,
    }));
  } finally {
    client.release();
  }
};

/**
 * Get all favorite albums for a user
 * @param {number} userId - User ID
 * @returns {Promise<array>} List of favorite albums with details
 */
export const getUserFavoriteAlbums = async (userId) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT album_id, album_name, artist, cover_image, marked_at FROM user_favorites WHERE user_id = $1 ORDER BY marked_at DESC',
      [userId]
    );

    return result.rows.map(row => ({
      albumId: row.album_id,
      albumName: row.album_name,
      artist: row.artist,
      coverImage: row.cover_image,
      markedAt: row.marked_at,
    }));
  } finally {
    client.release();
  }
};

/**
 * Get user's owned and favorite album IDs (for quick filtering)
 * @param {number} userId - User ID
 * @returns {Promise<object>} Sets of owned and favorite album IDs
 */
export const getUserAlbumStatus = async (userId) => {
  const client = await pool.connect();

  try {
    const [ownedResult, favoriteResult] = await Promise.all([
      client.query('SELECT album_id FROM user_vinyls WHERE user_id = $1', [userId]),
      client.query('SELECT album_id FROM user_favorites WHERE user_id = $1', [userId]),
    ]);

    return {
      owned: new Set(ownedResult.rows.map(row => row.album_id)),
      favorites: new Set(favoriteResult.rows.map(row => row.album_id)),
    };
  } finally {
    client.release();
  }
};

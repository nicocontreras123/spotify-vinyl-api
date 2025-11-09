import pool from '../config/database.js';

/**
 * Add an album to user's wishlist
 */
export const addToWishlist = async (userId, albumId, albumName, artist, coverImage) => {
  const query = `
    INSERT INTO user_wishlist (user_id, album_id, album_name, artist, cover_image)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, album_id) DO NOTHING
    RETURNING *
  `;

  const values = [userId, albumId, albumName, artist, coverImage];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw new Error('Error al agregar al álbum a la lista de deseos');
  }
};

/**
 * Remove an album from user's wishlist
 */
export const removeFromWishlist = async (userId, albumId) => {
  const query = `
    DELETE FROM user_wishlist
    WHERE user_id = $1 AND album_id = $2
    RETURNING *
  `;

  const values = [userId, albumId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw new Error('Error al eliminar el álbum de la lista de deseos');
  }
};

/**
 * Get all albums in user's wishlist
 */
export const getWishlist = async (userId) => {
  const query = `
    SELECT album_id AS "albumId", album_name AS "albumName", artist, cover_image AS "coverImage", added_at AS "addedAt"
    FROM user_wishlist
    WHERE user_id = $1
    ORDER BY added_at DESC
  `;

  const values = [userId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Error getting wishlist:', error);
    throw new Error('Error al obtener la lista de deseos');
  }
};

/**
 * Check if an album is in user's wishlist
 */
export const isInWishlist = async (userId, albumId) => {
  const query = `
    SELECT EXISTS(
      SELECT 1 FROM user_wishlist
      WHERE user_id = $1 AND album_id = $2
    ) AS "inWishlist"
  `;

  const values = [userId, albumId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].inWishlist;
  } catch (error) {
    console.error('Error checking wishlist status:', error);
    throw new Error('Error al verificar el estado de la lista de deseos');
  }
};

/**
 * Get wishlist count for a user
 */
export const getWishlistCount = async (userId) => {
  const query = `
    SELECT COUNT(*) as count
    FROM user_wishlist
    WHERE user_id = $1
  `;

  const values = [userId];

  try {
    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting wishlist count:', error);
    throw new Error('Error al obtener el contador de lista de deseos');
  }
};

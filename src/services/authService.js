import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = '30d'; // Token válido por 30 días

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 * @param {object} payload - User data to encode in token
 * @returns {string} JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} spotifyUserId - Optional Spotify user ID
 * @returns {Promise<object>} Created user and token
 */
export const registerUser = async (email, password, spotifyUserId = null) => {
  const client = await pool.connect();

  try {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('El email ya está registrado');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, spotify_user_id)
       VALUES ($1, $2, $3)
       RETURNING id, email, spotify_user_id, created_at`,
      [email, passwordHash, spotifyUserId]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        spotifyUserId: user.spotify_user_id,
        createdAt: user.created_at,
      },
      token,
    };
  } finally {
    client.release();
  }
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} User and token
 */
export const loginUser = async (email, password) => {
  const client = await pool.connect();

  try {
    // Find user by email
    const result = await client.query(
      'SELECT id, email, password_hash, spotify_user_id, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Email o contraseña incorrectos');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Email o contraseña incorrectos');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        spotifyUserId: user.spotify_user_id,
        createdAt: user.created_at,
      },
      token,
    };
  } finally {
    client.release();
  }
};

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<object>} User data
 */
export const getUserById = async (userId) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT id, email, spotify_user_id, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Link Spotify user ID to existing user account
 * @param {number} userId - User ID
 * @param {string} spotifyUserId - Spotify user ID
 * @returns {Promise<void>}
 */
export const linkSpotifyAccount = async (userId, spotifyUserId) => {
  const client = await pool.connect();

  try {
    await client.query(
      'UPDATE users SET spotify_user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [spotifyUserId, userId]
    );
  } finally {
    client.release();
  }
};

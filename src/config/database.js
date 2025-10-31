import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'spotify_vinyl',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

/**
 * Initialize database tables
 * Creates tables if they don't exist
 */
export const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('📊 Initializing database schema...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        spotify_user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ Users table ready');

    // Create user_vinyls table (albums the user owns)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_vinyls (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        album_id VARCHAR(255) NOT NULL,
        album_name VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, album_id)
      )
    `);
    console.log('  ✓ User vinyls table ready');

    // Create user_favorites table (albums the user favorites)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        album_id VARCHAR(255) NOT NULL,
        album_name VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, album_id)
      )
    `);
    console.log('  ✓ User favorites table ready');

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_vinyls_user_id ON user_vinyls(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id)
    `);
    console.log('  ✓ Indexes created');

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

// Initialize Supabase Client (Service Role for backend operations)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Strip query parameters like ?sslmode=require to avoid conflicts with our explicit ssl configuration in pg
const connectionString = env.DATABASE_URL.split('?')[0];
const isSupabase = env.DATABASE_URL.includes('supabase.co') || env.DATABASE_URL.includes('supabase.com');

const pool = new Pool({
  connectionString,
  ssl: isSupabase || env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  supabase,
  pool,
  query: (text, params) => pool.query(text, params)
};

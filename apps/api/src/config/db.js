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

// Initialize Postgres Pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  supabase,
  pool,
  query: (text, params) => pool.query(text, params)
};

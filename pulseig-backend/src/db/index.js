const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/pulseig',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('DB pool error:', err);
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

module.exports = db;

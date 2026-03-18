const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ODknqT91aBdv@ep-curly-smoke-andgjnlp-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

pool.on('connect', () => {
  // Connected
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

console.log(`✅ PostgreSQL pool initialized`);

module.exports = pool;

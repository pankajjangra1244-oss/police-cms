require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkAndSeed() {
  try {
    const res = await pool.query('SELECT badge_number FROM users');
    console.log('Current users in DB:', res.rows);
    
    if (res.rows.length === 0) {
      console.log('No users found! Seeding database...');
      const schemaPath = path.join(__dirname, 'src', 'db', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      await pool.query(schemaSql);
      console.log('Database seeded successfully from schema.sql');
    } else {
      console.log('Users exist. Testing if ADMIN001 is present:', res.rows.some(u => u.badge_number === 'ADMIN001'));
      
      // If ADMIN001 is missing, force seed specifically
      if (!res.rows.some(u => u.badge_number === 'ADMIN001')) {
         console.log('ADMIN001 missing. Re-inserting...');
         await pool.query(`
           INSERT INTO users (name, badge_number, email, password_hash, role, department)
           VALUES (
             'Admin Officer',
             'ADMIN001',
             'admin@policecms.gov',
             '$2a$10$rOzJqn4Q0k/DHpBe5lP7S.IYwJ3U4VJ7kCmP4YHqA5T1p7xK1lc3a',
             'admin',
             'Headquarters'
           ) ON CONFLICT (badge_number) DO NOTHING;
         `);
         console.log('ADMIN001 seeded.');
      }
    }
  } catch (err) {
    console.error('Database connection or seeding error:', err);
  } finally {
    await pool.end();
  }
}

checkAndSeed();

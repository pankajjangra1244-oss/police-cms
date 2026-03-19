require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Check users
    const existing = await pool.query('SELECT badge_number, password_hash FROM users WHERE badge_number = $1', ['ADMIN001']);
    
    if (existing.rows.length === 0) {
      console.log('ADMIN001 not found. Creating...');
      const hash = await bcrypt.hash('Admin@123', 10);
      console.log('Generated hash:', hash);
      await pool.query(
        `INSERT INTO users (name, badge_number, email, password_hash, role, department)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (badge_number) DO UPDATE SET password_hash = $4`,
        ['Admin Officer', 'ADMIN001', 'admin@policecms.gov', hash, 'admin', 'Headquarters']
      );
      
      const hash2 = await bcrypt.hash('Officer@123', 10);
      await pool.query(
        `INSERT INTO users (name, badge_number, email, password_hash, role, department)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (badge_number) DO UPDATE SET password_hash = $4`,
        ['John Kumar', 'OFF001', 'john.kumar@policecms.gov', hash2, 'officer', 'Crime Branch']
      );
      console.log('Users seeded successfully!');
    } else {
      console.log('ADMIN001 already exists.');
      const storedHash = existing.rows[0].password_hash;
      console.log('Stored hash:', storedHash);
      
      // Test if password matches
      const match = await bcrypt.compare('Admin@123', storedHash);
      console.log('Password "Admin@123" matches stored hash:', match);
      
      if (!match) {
        console.log('Hash mismatch! Updating password...');
        const newHash = await bcrypt.hash('Admin@123', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE badge_number = $2', [newHash, 'ADMIN001']);
        
        const newHash2 = await bcrypt.hash('Officer@123', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE badge_number = $2', [newHash2, 'OFF001']);
        console.log('Passwords updated successfully!');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();

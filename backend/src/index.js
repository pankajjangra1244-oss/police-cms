require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const uploadRoutes = require('./routes/uploads');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// One-time database seed endpoint
app.get('/api/seed', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const pool = require('./db/pool');

    const adminHash = await bcrypt.hash('Admin@123', 10);
    const officerHash = await bcrypt.hash('Officer@123', 10);

    await pool.query(`
      INSERT INTO users (name, badge_number, email, password_hash, role, department)
      VALUES 
        ('Admin Officer', 'ADMIN001', 'admin@policecms.gov', $1, 'admin', 'Headquarters'),
        ('John Kumar', 'OFF001', 'john.kumar@policecms.gov', $2, 'officer', 'Crime Branch')
      ON CONFLICT (badge_number) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [adminHash, officerHash]);

    res.json({ success: true, message: 'Database seeded! ADMIN001/Admin@123 and OFF001/Officer@123 are ready.' });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Police CMS Backend running on http://localhost:${PORT}`);
});

module.exports = app;

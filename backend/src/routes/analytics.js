const express = require('express');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'under_investigation' THEN 1 ELSE 0 END) as investigating,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END) as this_month
      FROM complaints
    `);
    const row = result.rows[0] || { total: 0, pending: 0, investigating: 0, resolved: 0, this_month: 0 };
    
    res.json({
      total: parseInt(row.total || 0),
      pending: parseInt(row.pending || 0),
      investigating: parseInt(row.investigating || 0),
      resolved: parseInt(row.resolved || 0),
      this_month: parseInt(row.this_month || 0),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/by-type
router.get('/by-type', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT incident_type, COUNT(*) as count 
      FROM complaints 
      WHERE created_at >= NOW() - INTERVAL '6 months' 
      GROUP BY incident_type 
      ORDER BY count DESC LIMIT 10
    `);
    res.json(result.rows.map(r => ({ incident_type: r.incident_type, count: parseInt(r.count) })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch type analytics' });
  }
});

// GET /api/analytics/by-month
router.get('/by-month', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT to_char(created_at, 'YYYY-MM') as sort_key, to_char(created_at, 'Mon YYYY') as month, COUNT(*) as count 
      FROM complaints 
      WHERE created_at >= NOW() - INTERVAL '12 months' 
      GROUP BY sort_key, month 
      ORDER BY sort_key ASC
    `);
    res.json(result.rows.map(r => ({ ...r, count: parseInt(r.count) })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
});

// GET /api/analytics/by-status
router.get('/by-status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM complaints 
      GROUP BY status 
      ORDER BY count DESC
    `);
    res.json(result.rows.map(r => ({ status: r.status, count: parseInt(r.count) })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status analytics' });
  }
});

// GET /api/analytics/hotspots
router.get('/hotspots', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT location, latitude, longitude, COUNT(*) as count, array_agg(DISTINCT incident_type) as types 
      FROM complaints 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
      GROUP BY location, latitude, longitude 
      ORDER BY count DESC LIMIT 50
    `);
    res.json(result.rows.map(r => ({
      location: r.location,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      count: parseInt(r.count),
      types: r.types
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// GET /api/analytics/ai-insights
router.get('/ai-insights', authenticateToken, async (req, res) => {
  try {
    const insights = [];
    
    // Top location in last 30 days
    const locResult = await pool.query(`
      SELECT location, COUNT(*) as count 
      FROM complaints 
      WHERE created_at >= NOW() - INTERVAL '30 days' AND location IS NOT NULL
      GROUP BY location ORDER BY count DESC LIMIT 1
    `);
    
    if (locResult.rows.length > 0) {
      const topLoc = locResult.rows[0];
      insights.push({ 
        type: 'high_risk_area', 
        priority: 'critical', 
        title: `🚨 High Crime Area: ${topLoc.location}`, 
        description: `${topLoc.count} incidents in past 30 days. Recommend increased patrol frequency.` 
      });
    }

    // Top hour in last 30 days
    const hourResult = await pool.query(`
      SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count 
      FROM complaints 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY hour ORDER BY count DESC LIMIT 1
    `);
    
    if (hourResult.rows.length > 0) {
      const h = parseInt(hourResult.rows[0].hour);
      insights.push({ 
        type: 'patrol_timing', 
        priority: 'high', 
        title: `⏰ Peak Crime Hours: ${h}:00 - ${(h+2)%24}:00`, 
        description: `Most incidents occur around ${h}:00. Schedule additional patrols during this window.` 
      });
    }

    insights.push({ 
      type: 'pattern_detection', 
      priority: 'medium', 
      title: '📊 Crime Pattern Analysis', 
      description: 'Run weekly crime mapping sessions to compare hotspot shifts and allocate resources.' 
    });

    res.json({ insights, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;

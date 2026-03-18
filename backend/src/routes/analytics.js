const express = require('express');
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const [total, pending, investigating, resolved] = await Promise.all([
      db.complaints.countAsync({}),
      db.complaints.countAsync({ status: 'pending' }),
      db.complaints.countAsync({ status: 'under_investigation' }),
      db.complaints.countAsync({ status: 'resolved' }),
    ]);

    const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0,0,0,0);
    const thisMonth = await db.complaints.countAsync({ created_at: { $gte: thisMonthStart.toISOString() } });

    res.json({ total, pending, investigating, resolved, this_month: thisMonth });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/by-type
router.get('/by-type', authenticateToken, async (req, res) => {
  try {
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const all = await db.complaints.findAsync({ created_at: { $gte: sixMonthsAgo.toISOString() } });
    const counts = {};
    all.forEach(c => { counts[c.incident_type] = (counts[c.incident_type] || 0) + 1; });
    const rows = Object.entries(counts).map(([incident_type, count]) => ({ incident_type, count })).sort((a,b) => b.count - a.count).slice(0, 10);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch type analytics' });
  }
});

// GET /api/analytics/by-month
router.get('/by-month', authenticateToken, async (req, res) => {
  try {
    const twelveMonthsAgo = new Date(); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const all = await db.complaints.findAsync({ created_at: { $gte: twelveMonthsAgo.toISOString() } });
    const counts = {};
    all.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      if (!counts[key]) counts[key] = { month: label, sort_key: key, count: 0 };
      counts[key].count++;
    });
    res.json(Object.values(counts).sort((a,b) => a.sort_key.localeCompare(b.sort_key)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
});

// GET /api/analytics/by-status
router.get('/by-status', authenticateToken, async (req, res) => {
  try {
    const all = await db.complaints.findAsync({});
    const counts = {};
    all.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    res.json(Object.entries(counts).map(([status, count]) => ({ status, count })).sort((a,b) => b.count - a.count));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status analytics' });
  }
});

// GET /api/analytics/hotspots
router.get('/hotspots', authenticateToken, async (req, res) => {
  try {
    const all = await db.complaints.findAsync({ latitude: { $exists: true }, longitude: { $exists: true } });
    const grouped = {};
    all.forEach(c => {
      if (!c.latitude || !c.longitude) return;
      const key = c.location || `${c.latitude},${c.longitude}`;
      if (!grouped[key]) grouped[key] = { location: c.location, latitude: c.latitude, longitude: c.longitude, count: 0, types: new Set() };
      grouped[key].count++;
      if (c.incident_type) grouped[key].types.add(c.incident_type);
    });
    const hotspots = Object.values(grouped).map(h => ({ ...h, types: [...h.types] })).sort((a,b) => b.count - a.count).slice(0, 50);
    res.json(hotspots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// GET /api/analytics/ai-insights
router.get('/ai-insights', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = await db.complaints.findAsync({ created_at: { $gte: thirtyDaysAgo.toISOString() } });

    const locationCounts = {};
    const hourCounts = {};
    recent.forEach(c => {
      if (c.location) locationCounts[c.location] = (locationCounts[c.location] || 0) + 1;
      if (c.date_time) { const h = new Date(c.date_time).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1; }
    });

    const insights = [];
    const topLocation = Object.entries(locationCounts).sort((a,b) => b[1] - a[1])[0];
    if (topLocation) {
      insights.push({ type: 'high_risk_area', priority: 'critical', title: `🚨 High Crime Area: ${topLocation[0]}`, description: `${topLocation[1]} incidents in past 30 days. Recommend increased patrol frequency in this area.` });
    }
    const topHour = Object.entries(hourCounts).sort((a,b) => b[1] - a[1])[0];
    if (topHour) {
      insights.push({ type: 'patrol_timing', priority: 'high', title: `⏰ Peak Crime Hours: ${topHour[0]}:00 - ${(parseInt(topHour[0])+2)%24}:00`, description: `Most incidents occur around ${topHour[0]}:00. Schedule additional patrols during this window.` });
    }
    insights.push({ type: 'pattern_detection', priority: 'medium', title: '📊 Crime Pattern Analysis', description: 'Run weekly crime mapping sessions to compare hotspot shifts and allocate resources proactively.' });

    res.json({ insights, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;

const express = require('express');
const axios = require('axios');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function geocodeLocation(locationStr) {
  try {
    const headers = { 'User-Agent': 'PoliceCMS-CaseManagementApp/1.0 (admin@policecms.gov)' };
    let res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: locationStr, format: 'json', limit: 1 },
      headers
    });
    if (!res.data || res.data.length === 0) {
      const parts = locationStr.split(',').map(s => s.trim());
      const fallbackQuery = parts.length > 1 ? parts[parts.length - 1] : locationStr.split(' ')[0];
      res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: fallbackQuery, format: 'json', limit: 1 },
        headers
      });
    }
    if (res.data && res.data.length > 0) {
      return { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) };
    }
  } catch (err) {
    console.error('Geocoding failed for:', locationStr, err.response?.status, err.message);
  }
  return null;
}

const generateComplaintNumber = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `CMP-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`;
};

// GET /api/complaints
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, incident_type, search, page = 1, limit = 20 } = req.query;
    
    let baseSql = `FROM complaints c LEFT JOIN users u ON c.officer_id = u.id WHERE 1=1`;
    let params = [];
    let paramIdx = 1;

    if (status) { baseSql += ` AND c.status = $${paramIdx++}`; params.push(status); }
    if (incident_type) { baseSql += ` AND c.incident_type = $${paramIdx++}`; params.push(incident_type); }
    if (req.user.role !== 'admin') { baseSql += ` AND c.officer_id = $${paramIdx++}`; params.push(req.user.id); }
    if (search) {
      baseSql += ` AND (c.complainant_name ILIKE $${paramIdx} OR c.description ILIKE $${paramIdx} OR c.location ILIKE $${paramIdx} OR c.complaint_number ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) ${baseSql}`, params);
    const total = parseInt(countResult.rows[0].count);

    const off = (parseInt(page) - 1) * parseInt(limit);
    const dataSql = `SELECT c.*, u.name as officer_name, u.badge_number ${baseSql} ORDER BY c.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    
    const dataResult = await pool.query(dataSql, [...params, limit, off]);

    res.json({ 
      complaints: dataResult.rows, 
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } 
    });
  } catch (err) {
    console.error('Get complaints error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const compResult = await pool.query(`
      SELECT c.*, u.name as officer_name, u.badge_number 
      FROM complaints c LEFT JOIN users u ON c.officer_id = u.id 
      WHERE c.id = $1
    `, [req.params.id]);

    if (compResult.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const complaint = compResult.rows[0];

    const evResult = await pool.query('SELECT * FROM evidence WHERE complaint_id = $1 ORDER BY uploaded_at DESC', [req.params.id]);

    res.json({ ...complaint, evidence: evResult.rows });
  } catch (err) {
    console.error('Fetch complaint error:', err);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

// POST /api/complaints
router.post('/', authenticateToken, async (req, res) => {
  try {
    let { complainant_name, mobile, incident_type, date_time, location, state, district, latitude, longitude, description, priority } = req.body;
    if (!complainant_name || !incident_type)
      return res.status(400).json({ error: 'Complainant name and incident type are required' });

    if ((location || district || state) && (!latitude || !longitude)) {
      const fullLocation = [location, district, state, 'India'].filter(Boolean).join(', ');
      const coords = await geocodeLocation(fullLocation);
      if (coords) { latitude = coords.lat; longitude = coords.lon; }
    }

    const compNum = generateComplaintNumber();
    const insertSql = `
      INSERT INTO complaints 
      (complaint_number, complainant_name, mobile, incident_type, date_time, location, state, district, latitude, longitude, description, priority, officer_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
    `;
    const insertVals = [compNum, complainant_name, mobile, incident_type, date_time || new Date(), location, state, district, latitude, longitude, description, priority || 'medium', req.user.id];
    
    const result = await pool.query(insertSql, insertVals);
    const doc = result.rows[0];

    await pool.query('INSERT INTO activity_logs (user_id, complaint_id, action, details) VALUES ($1, $2, $3, $4)', 
      [req.user.id, doc.id, 'complaint_created', `Complaint ${doc.complaint_number} created`]);

    res.status(201).json(doc);
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// PUT /api/complaints/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const existingResult = await pool.query('SELECT * FROM complaints WHERE id = $1', [req.params.id]);
    if (existingResult.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const existing = existingResult.rows[0];

    let updateFields = [];
    let updateVals = [];
    let paramIdx = 1;
    const fields = ['complainant_name','mobile','incident_type','date_time','location','state','district','latitude','longitude','description','status','priority'];
    
    let newLat = req.body.latitude;
    let newLon = req.body.longitude;

    if ((req.body.location !== undefined && req.body.location !== existing.location) || 
        (req.body.district !== undefined && req.body.district !== existing.district) || 
        (req.body.state !== undefined && req.body.state !== existing.state)) {
      if (!newLat || !newLon) {
        const fullLocation = [req.body.location || existing.location, req.body.district || existing.district, req.body.state || existing.state, 'India'].filter(Boolean).join(', ');
        const coords = await geocodeLocation(fullLocation);
        if (coords) { newLat = coords.lat; newLon = coords.lon; }
      }
    }

    const mergedBody = { ...req.body };
    if (newLat !== undefined) mergedBody.latitude = newLat;
    if (newLon !== undefined) mergedBody.longitude = newLon;

    fields.forEach(f => { 
      if (mergedBody[f] !== undefined) {
        updateFields.push(`${f} = $${paramIdx++}`);
        updateVals.push(mergedBody[f]);
      } 
    });

    if (updateFields.length === 0) return res.json(existing);

    updateVals.push(req.params.id);
    const updateSql = `UPDATE complaints SET ${updateFields.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
    const updatedResult = await pool.query(updateSql, updateVals);

    await pool.query('INSERT INTO activity_logs (user_id, complaint_id, action, details) VALUES ($1, $2, $3, $4)', 
      [req.user.id, req.params.id, 'complaint_updated', `Status: ${mergedBody.status || 'unchanged'}`]);

    res.json(updatedResult.rows[0]);
  } catch (err) {
    console.error('Update complaint error:', err);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// DELETE /api/complaints/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await pool.query('DELETE FROM complaints WHERE id = $1', [req.params.id]);
    res.json({ message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

module.exports = router;

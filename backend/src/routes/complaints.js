const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function geocodeLocation(locationStr) {
  try {
    // OpenStreetMap strictly requires a unique User-Agent
    const headers = { 'User-Agent': 'PoliceCMS-CaseManagementApp/1.0 (admin@policecms.gov)' };
    
    // Attempt 1: Full string
    let res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: locationStr, format: 'json', limit: 1 },
      headers
    });
    
    // Attempt 2: If no results, try just the first few words or the last word (maybe city)
    if (!res.data || res.data.length === 0) {
      const parts = locationStr.split(',').map(s => s.trim());
      const fallbackQuery = parts.length > 1 ? parts[parts.length - 1] : locationStr.split(' ')[0];
      
      res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: fallbackQuery, format: 'json', limit: 1 },
        headers
      });
    }

    if (res.data && res.data.length > 0) {
      return {
        lat: parseFloat(res.data[0].lat),
        lon: parseFloat(res.data[0].lon)
      };
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
    const query = {};
    if (status)        query.status = status;
    if (incident_type) query.incident_type = incident_type;
    if (req.user.role !== 'admin') query.officer_id = req.user.id;
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ complainant_name: re }, { description: re }, { location: re }, { complaint_number: re }];
    }

    const allMatching = await db.complaints.findAsync(query).sort({ created_at: -1 });
    const total = allMatching.length;
    const off = (page - 1) * limit;
    const complaints = allMatching.slice(off, off + parseInt(limit));

    // Attach officer names
    const enriched = await Promise.all(complaints.map(async c => {
      const officer = c.officer_id ? await db.users.findOneAsync({ _id: c.officer_id }) : null;
      return { ...c, id: c._id, officer_name: officer?.name, badge_number: officer?.badge_number };
    }));

    res.json({ complaints: enriched, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get complaints error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const complaint = await db.complaints.findOneAsync({ _id: req.params.id });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const officer = complaint.officer_id ? await db.users.findOneAsync({ _id: complaint.officer_id }) : null;
    const evidence = await db.evidence.findAsync({ complaint_id: req.params.id }).sort({ uploaded_at: -1 });
    const evidenceWithId = evidence.map(e => ({ ...e, id: e._id }));

    res.json({ ...complaint, id: complaint._id, officer_name: officer?.name, badge_number: officer?.badge_number, evidence: evidenceWithId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

// POST /api/complaints
router.post('/', authenticateToken, async (req, res) => {
  try {
    let { complainant_name, mobile, incident_type, date_time, location, state, district, latitude, longitude, description, priority } = req.body;
    if (!complainant_name || !incident_type)
      return res.status(400).json({ error: 'Complainant name and incident type are required' });

    // Automatic Geocoding if location is provided but coordinates are missing
    if ((location || district || state) && (!latitude || !longitude)) {
      const fullLocation = [location, district, state, 'India'].filter(Boolean).join(', ');
      const coords = await geocodeLocation(fullLocation);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lon;
      }
    }

    const now = new Date().toISOString();
    const doc = await db.complaints.insertAsync({
      _id: uuidv4(), complaint_number: generateComplaintNumber(),
      complainant_name, mobile, incident_type,
      date_time: date_time || now, location, state, district, latitude, longitude,
      description, priority: priority || 'medium',
      status: 'pending', officer_id: req.user.id,
      created_at: now, updated_at: now
    });

    await db.logs.insertAsync({ _id: uuidv4(), user_id: req.user.id, complaint_id: doc._id, action: 'complaint_created', details: `Complaint ${doc.complaint_number} created`, created_at: now });
    res.status(201).json({ ...doc, id: doc._id });
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// PUT /api/complaints/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await db.complaints.findOneAsync({ _id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'Complaint not found' });

    const update = {};
    const fields = ['complainant_name','mobile','incident_type','date_time','location','state','district','latitude','longitude','description','status','priority'];
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    update.updated_at = new Date().toISOString();

    if ((req.body.location !== existing.location) || (req.body.district !== existing.district) || (req.body.state !== existing.state)) {
      if (!req.body.latitude || !req.body.longitude) {
        const fullLocation = [update.location || existing.location, update.district || existing.district, update.state || existing.state, 'India'].filter(Boolean).join(', ');
        const coords = await geocodeLocation(fullLocation);
        if (coords) {
          update.latitude = coords.lat;
          update.longitude = coords.lon;
        }
      }
    }

    await db.complaints.updateAsync({ _id: req.params.id }, { $set: update });
    await db.logs.insertAsync({ _id: uuidv4(), user_id: req.user.id, complaint_id: req.params.id, action: 'complaint_updated', details: `Status: ${update.status || 'unchanged'}`, created_at: new Date().toISOString() });

    const updated = await db.complaints.findOneAsync({ _id: req.params.id });
    res.json({ ...updated, id: updated._id });
  } catch (err) {
    console.error('Update complaint error:', err);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// DELETE /api/complaints/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    await db.complaints.removeAsync({ _id: req.params.id }, {});
    res.json({ message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

module.exports = router;

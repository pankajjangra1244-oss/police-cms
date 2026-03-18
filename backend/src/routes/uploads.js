const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const fs = require('fs');

const router = express.Router();
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = path.join(uploadDir, req.params.complaintId || 'general');
    fs.mkdirSync(subDir, { recursive: true });
    cb(null, subDir);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/mpeg','audio/mpeg','audio/wav','audio/ogg','application/pdf'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/uploads/:complaintId
router.post('/:complaintId', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const { complaintId } = req.params;
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

    const complaint = await db.complaints.findOneAsync({ _id: complaintId });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const now = new Date().toISOString();
    const insertedFiles = await Promise.all(req.files.map(async file => {
      const relativePath = path.relative(path.join(__dirname, '../..'), file.path).replace(/\\/g, '/');
      const doc = await db.evidence.insertAsync({
        _id: uuidv4(), complaint_id: complaintId, file_name: file.originalname,
        file_path: relativePath, file_type: file.mimetype.split('/')[0],
        file_size: file.size, mime_type: file.mimetype,
        uploaded_by: req.user.id, uploaded_at: now
      });
      return { ...doc, id: doc._id };
    }));

    res.status(201).json({ message: `${insertedFiles.length} file(s) uploaded`, files: insertedFiles });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// GET /api/uploads/:complaintId
router.get('/:complaintId', authenticateToken, async (req, res) => {
  try {
    const files = await db.evidence.findAsync({ complaint_id: req.params.complaintId }).sort({ uploaded_at: -1 });
    res.json(files.map(f => ({ ...f, id: f._id })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// DELETE /api/uploads/file/:id
router.delete('/file/:id', authenticateToken, async (req, res) => {
  try {
    const file = await db.evidence.findOneAsync({ _id: req.params.id });
    if (!file) return res.status(404).json({ error: 'File not found' });
    const filePath = path.join(__dirname, '../..', file.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await db.evidence.removeAsync({ _id: req.params.id }, {});
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;

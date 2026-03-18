const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
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

    const compResult = await pool.query('SELECT * FROM complaints WHERE id = $1', [complaintId]);
    if (compResult.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });

    const insertedFiles = [];
    for (const file of req.files) {
      const relativePath = path.relative(path.join(__dirname, '../..'), file.path).replace(/\\/g, '/');
      
      const insertSql = `
        INSERT INTO evidence (complaint_id, file_name, file_path, file_type, file_size, mime_type, uploaded_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `;
      const docRes = await pool.query(insertSql, [
        complaintId, file.originalname, relativePath, 
        file.mimetype.split('/')[0], file.size, file.mimetype, req.user.id
      ]);
      insertedFiles.push(docRes.rows[0]);
    }

    res.status(201).json({ message: `${insertedFiles.length} file(s) uploaded`, files: insertedFiles });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// GET /api/uploads/:complaintId
router.get('/:complaintId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM evidence WHERE complaint_id = $1 ORDER BY uploaded_at DESC', [req.params.complaintId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

// DELETE /api/uploads/file/:id
router.delete('/file/:id', authenticateToken, async (req, res) => {
  try {
    const fileResult = await pool.query('SELECT * FROM evidence WHERE id = $1', [req.params.id]);
    if (fileResult.rows.length === 0) return res.status(404).json({ error: 'File not found' });
    
    const file = fileResult.rows[0];
    const filePath = path.join(__dirname, '../..', file.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    await pool.query('DELETE FROM evidence WHERE id = $1', [req.params.id]);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;

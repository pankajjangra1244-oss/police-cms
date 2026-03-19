const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

const router = express.Router();

// Configure Cloudinary (set these env vars on Render)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — files go straight to cloud, never touch disk
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  // Allow all file types for comprehensive evidence gathering
  cb(null, true);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (buffer, originalname, mimetype) => {
  return new Promise((resolve, reject) => {
    let resourceType = 'raw';
    if (mimetype.startsWith('image/')) resourceType = 'image';
    if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) resourceType = 'video';

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'police-cms-evidence',
        resource_type: resourceType,
        public_id: `${uuidv4()}-${originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

// POST /api/uploads/:complaintId
router.post('/:complaintId', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const { complaintId } = req.params;
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

    const compResult = await pool.query('SELECT * FROM complaints WHERE id = $1', [complaintId]);
    if (compResult.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });

    const insertedFiles = [];
    for (const file of req.files) {
      let fileUrl = '';
      let publicId = '';

      // If Cloudinary is configured, upload there. Otherwise store as data URL fallback.
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const cloudResult = await uploadToCloudinary(file.buffer, file.originalname, file.mimetype);
        fileUrl = cloudResult.secure_url;
        publicId = cloudResult.public_id;
      } else {
        // Fallback: store as base64 data URL in DB (small files only)
        fileUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        publicId = uuidv4();
      }

      const insertSql = `
        INSERT INTO evidence (complaint_id, file_name, file_path, file_type, file_size, mime_type, uploaded_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `;
      const docRes = await pool.query(insertSql, [
        complaintId, file.originalname, fileUrl,
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
    const result = await pool.query(
      'SELECT * FROM evidence WHERE complaint_id = $1 ORDER BY uploaded_at DESC',
      [req.params.complaintId]
    );
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
    // Try to delete from Cloudinary if it looks like a Cloudinary URL
    if (process.env.CLOUDINARY_CLOUD_NAME && file.file_path?.includes('cloudinary.com')) {
      try {
        const urlParts = file.file_path.split('/');
        const publicId = urlParts.slice(-2).join('/').replace(/\.[^.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudErr) {
        console.warn('Cloudinary delete failed:', cloudErr.message);
      }
    }

    await pool.query('DELETE FROM evidence WHERE id = $1', [req.params.id]);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;

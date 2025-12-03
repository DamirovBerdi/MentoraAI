const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { }

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// List files
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir).map(name => {
      const stat = fs.statSync(path.join(uploadDir, name));
      return { name, size: stat.size, mtime: stat.mtimeMs };
    });
    res.json({ ok: true, files });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Upload a file (field name: file)
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file' });
  res.json({ ok: true, file: { originalname: req.file.originalname, size: req.file.size } });
});

// Download file
router.get('/download/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const full = path.join(uploadDir, name);
  if (!fs.existsSync(full)) return res.status(404).json({ ok: false, error: 'Not found' });
  res.download(full, name);
});

// Delete file
router.delete('/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const full = path.join(uploadDir, name);
  if (!fs.existsSync(full)) return res.status(404).json({ ok: false, error: 'Not found' });
  try {
    fs.unlinkSync(full);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;

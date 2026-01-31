const express = require('express');
const multer = require('multer');
const path = require('path');
const { nanoid } = require('nanoid');
const auth = require('../middleware/auth');
const db = require('../db');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${nanoid(6)}-${file.originalname}`)
});
const upload = multer({ storage });

router.get('/', (req, res) => {
  res.json(db.getAssets());
});

router.post('/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const asset = db.createAsset({ filename: req.file.filename, mimetype: req.file.mimetype, authorId: req.user.id, url: `/uploads/${req.file.filename}` });
  res.json(asset);
});

module.exports = router;
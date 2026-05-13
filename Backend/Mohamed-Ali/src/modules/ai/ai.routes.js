const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateUser, requireRole } = require('../../middleware/auth.middleware');
const { generateQuizFromPDFBuffer } = require('./ai.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// POST /api/ai/generate-quiz
router.post(
  '/generate-quiz',
  authenticateUser,
  requireRole('PROFESSOR', 'DOCTOR', 'ADMIN'),
  upload.single('pdf'),
  generateQuizFromPDFBuffer
);

module.exports = router;

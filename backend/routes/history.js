const express = require('express');
const router = express.Router();
const { sessions } = require('../controllers/uploadController');

/**
 * GET /api/history
 * Returns list of sessions (in-memory)
 */
router.get('/', (req, res) => {
  const sessionList = Object.entries(sessions).map(([id, data]) => ({
    sessionId: id,
    fileCount: data.uploadedFiles?.length || 0,
    documentTypes: (data.extractedDocs || []).map((d) => d.documentType),
    riskLevel: data.validationResult?.riskScore?.level || null,
    mismatchCount: data.validationResult?.mismatches?.length || 0,
    createdAt: data.uploadedFiles?.[0]?.uploadedAt || null,
  }));

  res.json({ success: true, sessions: sessionList, count: sessionList.length });
});

/**
 * GET /api/history/:sessionId
 * Returns full session data
 */
router.get('/:sessionId', (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  res.json({ success: true, session });
});

module.exports = router;

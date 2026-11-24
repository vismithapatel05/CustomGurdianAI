const express = require('express');
const router = express.Router();
const { extractDocuments } = require('../controllers/extractController');

// POST /api/extract
router.post('/', extractDocuments);

module.exports = router;

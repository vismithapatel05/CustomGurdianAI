const express = require('express');
const router = express.Router();
const { compareDocuments } = require('../controllers/compareController');

// POST /api/compare
router.post('/', compareDocuments);

module.exports = router;

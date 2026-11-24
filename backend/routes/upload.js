const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { uploadFiles } = require('../controllers/uploadController');

// POST /api/upload — accept up to 20 files
router.post('/', upload.array('files', 20), uploadFiles);

module.exports = router;

const express = require('express');
const router = express.Router();
const { startValidation, getValidationStatus } = require('../controllers/validationController');

router.post('/start', startValidation);
router.get('/:sessionId/status', getValidationStatus);

module.exports = router;

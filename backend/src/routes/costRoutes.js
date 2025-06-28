const express = require('express');
const router = express.Router();
const { calculateCost } = require('../controllers/costController');
const { auth } = require('../middleware/auth');

router.post('/calculate', auth, calculateCost);

module.exports = router;

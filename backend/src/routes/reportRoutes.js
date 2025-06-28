const express = require('express');
const router = express.Router();
const { getReports } = require('../controllers/reportController');
const { auth, authorizeRoles } = require('../middleware/auth');

router.get('/', auth, authorizeRoles('admin'), getReports);

module.exports = router;

const express = require('express');
const router = express.Router();
const { listJobs } = require('../controllers/slurmController');
const { auth } = require('../middleware/auth');

router.get('/jobs', auth, listJobs);

module.exports = router;

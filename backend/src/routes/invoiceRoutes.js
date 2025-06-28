const express = require('express');
const router = express.Router();
const { generateInvoice } = require('../controllers/invoiceController');
const { auth } = require('../middleware/auth');

router.post('/generate', auth, generateInvoice);

module.exports = router;

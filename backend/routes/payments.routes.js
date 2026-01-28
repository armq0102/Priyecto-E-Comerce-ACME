const { Router } = require('express');
const verifyToken = require('../auth.middleware');
const { createTransaction } = require('../controllers/payment.controller');
const { handleWompiWebhook } = require('../controllers/webhook.controller');

const router = Router();

router.post('/create-transaction', verifyToken, createTransaction);
router.post('/webhook', handleWompiWebhook);

module.exports = router;
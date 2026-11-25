const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/publicPlanController');

const router = express.Router();
router.get('/plans', rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false }), controller.listPlans);

module.exports = router;

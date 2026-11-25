const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { requireBillingManager } = require('../middleware/billingRoleMiddleware');
const { createPlanChangeRequestSchema } = require('../validators/supportValidators');
const { billingCurrencySchema } = require('../validators/billingValidators');
const billingController = require('../controllers/billingController');

const router = express.Router();
router.use(authenticate);
router.put('/currency', requireBillingManager, validate(billingCurrencySchema), billingController.updateCurrency);
router.post('/plan-change-requests', requireBillingManager, validate(createPlanChangeRequestSchema), billingController.createPlanChangeRequest);
module.exports = router;

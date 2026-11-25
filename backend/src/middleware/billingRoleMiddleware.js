const { AppError } = require('./errorMiddleware');

function requireBillingManager(req, res, next) {
  if (['owner', 'admin'].includes(req.user?.role)) return next();
  return next(new AppError('Seuls les propriétaires et administrateurs peuvent gérer la facturation', 403, {
    code: 'BILLING_ROLE_REQUIRED',
  }));
}

module.exports = { requireBillingManager };

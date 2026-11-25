const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const STATUSES = ['initialized', 'paid', 'failed', 'abandoned'];

const PaymentTransaction = sequelize.define('PaymentTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  initiatedByUserId: { type: DataTypes.UUID, allowNull: true, field: 'initiated_by_user_id' },
  planName: { type: DataTypes.STRING(20), allowNull: false, field: 'plan_name' },
  amount: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'XOF' },
  paystackReference: { type: DataTypes.STRING(100), allowNull: false, unique: true, field: 'paystack_reference' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'initialized', validate: { isIn: [STATUSES] } },
  paystackData: { type: DataTypes.JSONB, allowNull: true, field: 'paystack_data' },
  paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
}, {
  tableName: 'payment_transactions', timestamps: true, underscored: true, freezeTableName: true,
  indexes: [{ fields: ['tenant_id', 'status'], name: 'payment_transactions_tenant_status_idx' }],
});

module.exports = PaymentTransaction;
module.exports.STATUSES = STATUSES;

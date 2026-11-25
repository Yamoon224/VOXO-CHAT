const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CreditLedger = sequelize.define('CreditLedger', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  amount: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['cycle_grant', 'manual_grant', 'manual_debit']] } },
  periodKey: { type: DataTypes.STRING(7), allowNull: true, field: 'period_key' },
  note: { type: DataTypes.STRING(250), allowNull: true },
  createdByAdminId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_admin_id' },
}, {
  tableName: 'credit_ledger', timestamps: true, underscored: true, freezeTableName: true,
  indexes: [{ fields: ['tenant_id', 'created_at'], name: 'credit_ledger_tenant_created_idx' }, { fields: ['tenant_id', 'period_key', 'type'], unique: true, name: 'credit_ledger_cycle_unique_idx', where: { type: 'cycle_grant' } }],
});

module.exports = CreditLedger;

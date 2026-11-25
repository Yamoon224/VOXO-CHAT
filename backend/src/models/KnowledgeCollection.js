const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('KnowledgeCollection', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(255), allowNull: false },
  category: { type: DataTypes.STRING(150), allowNull: false },
  status: {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft',
    validate: { isIn: [['draft', 'published', 'archived']] },
  },
  createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' },
}, {
  tableName: 'knowledge_collections', timestamps: true, underscored: true, freezeTableName: true,
});

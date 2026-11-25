// src/config/database.js
const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  // logging: config.env === 'development' ? console.log : false,
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

// Test de connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL établie avec succès');
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };
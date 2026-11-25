require('dotenv').config();

const sharedConfig = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: sharedConfig,
  test: sharedConfig,
  production: sharedConfig,
};

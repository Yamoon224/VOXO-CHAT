const config = require('../config/config');
const { sequelize } = require('../config/database');
const { closeInactiveConversations } = require('../services/conversationLifecycleService');

async function run() {
  const closed = await closeInactiveConversations(config.conversations.inactivityMinutes);
  console.log(`${closed} conversations inactives cloturees.`);
}

run().catch(error => {
  console.error('Echec cloture conversations:', error);
  process.exitCode = 1;
}).finally(() => sequelize.close());

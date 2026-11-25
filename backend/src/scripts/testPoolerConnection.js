// src/scripts/testPoolerConnection.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

async function testPoolerConnection() {
  console.log('🧪 TEST AVEC POOLER SUPABASE (IPv4)');
  console.log('='.repeat(50));
  
  const connections = [
    { name: 'Connexion principale', url: process.env.DATABASE_URL },
    { name: 'Session Pooler', url: process.env.DATABASE_SESSION_URL },
    { name: 'Connexion directe', url: process.env.DATABASE_DIRECT_URL }
  ].filter(connection => connection.url);

  if (connections.length === 0) {
    throw new Error('DATABASE_URL est requis pour exécuter ce diagnostic');
  }
  
  for (let i = 0; i < connections.length; i++) {
    const { name, url } = connections[i];
    
    console.log(`\n${i + 1}️⃣ Test ${name}...`);
    
    try {
      const sequelize = new Sequelize(url, {
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        },
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        }
      });
      
      await sequelize.authenticate();
      console.log(`✅ ${name} - Connexion réussie !`);
      
      // Test d'une requête simple
      const [results] = await sequelize.query('SELECT NOW() as current_time');
      console.log(`   ⏰ Heure: ${results[0].current_time}`);
      
      await sequelize.close();
      
      console.log(`✅ ${name} fonctionne parfaitement !`);
      console.log(`🎯 URL recommandée: ${url.replace(/:([^:@]+)@/, ':****@')}`);
      break; // Arrêter dès qu'on trouve une connexion qui marche
      
    } catch (error) {
      console.log(`❌ ${name} - Échec: ${error.message.substring(0, 100)}...`);
    }
  }
  
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('1. Utilise le Transaction Pooler en priorité');
  console.log('2. Configure les URL supplémentaires uniquement via les variables d’environnement');
  console.log('3. Le pooler utilise IPv4 et évite les problèmes de réseau');
}

testPoolerConnection();

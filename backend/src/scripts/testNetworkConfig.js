// src/scripts/testNetworkConfig.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

async function testWithDifferentConfigs() {
  console.log('🧪 TEST CONFIGURATIONS RÉSEAU');
  console.log('='.repeat(50));
  
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL est requis pour exécuter ce diagnostic');
  }
  
  const configs = [
    {
      name: 'Config Standard SSL',
      options: {
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        },
        logging: false
      }
    },
    {
      name: 'Config avec timeout',
      options: {
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          },
          connectTimeout: 60000,
        },
        logging: false
      }
    },
    {
      name: 'Config sans SSL (test)',
      options: {
        dialect: 'postgres',
        dialectOptions: {
          ssl: false
        },
        logging: false
      }
    },
    {
      name: 'Config avec IPv4 forcé',
      options: {
        dialect: 'postgres',
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          },
          host: 'aws-1-eu-north-1.pooler.supabase.com',
          family: 4, // Force IPv4
        },
        logging: false
      }
    }
  ];
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`\n${i + 1}️⃣ Test: ${config.name}...`);
    
    try {
      const sequelize = new Sequelize(baseUrl, config.options);
      
      // Test avec timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout après 15 secondes')), 15000)
      );
      
      await Promise.race([
        sequelize.authenticate(),
        timeoutPromise
      ]);
      
      console.log(`✅ ${config.name} - Succès !`);
      
      // Test rapide
      const [results] = await sequelize.query('SELECT 1 as test');
      console.log(`   ✅ Requête test: ${results[0].test}`);
      
      await sequelize.close();
      
      console.log(`🎯 Configuration fonctionnelle trouvée !`);
      break;
      
    } catch (error) {
      console.log(`❌ ${config.name} - Échec: ${error.message}`);
    }
  }
}

// Test de résolution DNS
async function testDNSResolution() {
  console.log('\n🌐 TEST RÉSOLUTION DNS');
  console.log('-'.repeat(30));
  
  const dns = require('dns').promises;
  
  const hosts = [
    'db.sqqegdjbffggwysmzmib.supabase.co',
    'aws-1-eu-north-1.pooler.supabase.com'
  ];
  
  for (const host of hosts) {
    try {
      const addresses = await dns.lookup(host, { all: true });
      console.log(`✅ ${host}:`);
      addresses.forEach(addr => {
        console.log(`   ${addr.family === 4 ? 'IPv4' : 'IPv6'}: ${addr.address}`);
      });
    } catch (error) {
      console.log(`❌ ${host}: ${error.message}`);
    }
  }
}

async function main() {
  await testDNSResolution();
  await testWithDifferentConfigs();
}

main();

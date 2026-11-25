require('dotenv').config();
const { Sequelize } = require('sequelize');

async function testSupabaseConnection() {
  console.log('🧪 TEST DE CONNEXION SUPABASE');
  console.log('='.repeat(50));
  
  // Affichage de la configuration
  console.log('🔧 CONFIGURATION:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Défini' : '❌ Manquant'}`);
  
  if (process.env.DATABASE_URL) {
    // Masquer le mot de passe dans l'affichage
    const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
    console.log(`URL: ${maskedUrl}`);
  }
  
  try {
    console.log('\n1️⃣ Test de connexion...');
    
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });
    
    await sequelize.authenticate();
    console.log('✅ Connexion Supabase réussie !');
    
    // Test d'une requête simple
    console.log('\n2️⃣ Test de requête...');
    const [results] = await sequelize.query('SELECT NOW() as current_time, version()');
    console.log(`✅ Heure serveur: ${results[0].current_time}`);
    console.log(`✅ Version: ${results[0].version.split(' ')[0]}`);
    
    // Test des tables
    console.log('\n3️⃣ Vérification des tables...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables trouvées:');
    tables.forEach(table => {
      console.log(`   • ${table.table_name}`);
    });
    
    // Fermer la connexion
    await sequelize.close();
    
    console.log('\n✅ TOUS LES TESTS SONT RÉUSSIS !');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n🔧 SOLUTION POSSIBLE:');
      console.log('1. Vérifiez votre mot de passe Supabase');
      console.log('2. Assurez-vous que DATABASE_URL contient le bon mot de passe');
    } else if (error.message.includes('ENETUNREACH') || error.message.includes('connect')) {
      console.log('\n🔧 PROBLÈME DE CONNEXION:');
      console.log('1. Vérifiez votre connexion internet');
      console.log('2. Vérifiez que l\'URL Supabase est correcte');
      console.log('3. Essayez de vous connecter à Supabase depuis leur interface web');
    }
  }
}

testSupabaseConnection();

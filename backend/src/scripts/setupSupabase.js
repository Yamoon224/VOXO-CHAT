// src/scripts/setupSupabase.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

async function setupSupabaseDatabase() {
  console.log('🚀 CONFIGURATION INITIALE SUPABASE');
  console.log('='.repeat(50));
  
  try {
    // Connexion avec la configuration qui fonctionne
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
      }
    });
    
    console.log('1️⃣ Connexion à Supabase...');
    await sequelize.authenticate();
    console.log('✅ Connecté à Supabase !');
    
    console.log('\n2️⃣ Vérification des tables existantes...');
    const [tables] = await sequelize.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenants', 'users', 'knowledge_base', 'conversations')
      ORDER BY table_name, ordinal_position;
    `);
    
    if (tables.length === 0) {
      console.log('❌ Aucune table trouvée !');
      console.log('💡 Vous devez d\'abord exécuter le script SQL dans Supabase:');
      console.log('   - Allez sur https://supabase.com/dashboard');
      console.log('   - Ouvrez l\'éditeur SQL');
      console.log('   - Exécutez le script de migration fourni');
      return;
    }
    
    console.log('✅ Tables trouvées:');
    const tableNames = [...new Set(tables.map(t => t.table_name))];
    tableNames.forEach(name => {
      console.log(`   • ${name}`);
    });
    
    console.log('\n3️⃣ Test d\'insertion de données...');
    
    // Test d'insertion d'un tenant
    const testTenantId = 'test-setup-' + Date.now();
    
    try {
      await sequelize.query(`
        INSERT INTO tenants (id, name, subscription_plan, created_at, updated_at) 
        VALUES ($1, $2, $3, NOW(), NOW())
      `, {
        bind: [testTenantId, 'Test Setup Tenant', 'free']
      });
      
      console.log('✅ Test d\'insertion réussi');
      
      // Vérifier l'insertion
      const [result] = await sequelize.query(`
        SELECT id, name, subscription_plan, created_at 
        FROM tenants 
        WHERE id = $1
      `, {
        bind: [testTenantId]
      });
      
      if (result.length > 0) {
        console.log('✅ Données récupérées:', {
          id: result[0].id,
          name: result[0].name,
          plan: result[0].subscription_plan
        });
      }
      
      // Nettoyer le test
      await sequelize.query(`DELETE FROM tenants WHERE id = $1`, {
        bind: [testTenantId]
      });
      
      console.log('✅ Nettoyage effectué');
      
    } catch (insertError) {
      console.error('❌ Erreur d\'insertion:', insertError.message);
    }
    
    console.log('\n4️⃣ Vérification des index et contraintes...');
    const [constraints] = await sequelize.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('tenants', 'users', 'knowledge_base', 'conversations')
      ORDER BY tc.table_name, tc.constraint_type;
    `);
    
    console.log('🔗 Contraintes trouvées:');
    constraints.forEach(c => {
      console.log(`   • ${c.table_name}: ${c.constraint_type} (${c.constraint_name})`);
    });
    
    console.log('\n5️⃣ Test des extensions Supabase...');
    const [extensions] = await sequelize.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'vector', 'pg_stat_statements');
    `);
    
    console.log('🔧 Extensions installées:');
    extensions.forEach(ext => {
      console.log(`   • ${ext.extname} v${ext.extversion}`);
    });
    
    if (!extensions.some(e => e.extname === 'uuid-ossp')) {
      console.log('⚠️  Extension uuid-ossp manquante - les UUIDs pourraient ne pas fonctionner');
    }
    
    if (!extensions.some(e => e.extname === 'vector')) {
      console.log('⚠️  Extension vector manquante - les embeddings ne fonctionneront pas');
    }
    
    await sequelize.close();
    
    console.log('\n🎉 CONFIGURATION SUPABASE TERMINÉE !');
    console.log('✅ Votre base de données est prête à être utilisée');
    console.log('\n📝 PROCHAINES ÉTAPES:');
    console.log('1. Remplacez XXXX par votre vrai mot de passe dans .env');
    console.log('2. Lancez votre serveur: npm run dev');
    console.log('3. Testez l\'inscription d\'un utilisateur');
    
  } catch (error) {
    console.error('\n❌ ERREUR DE CONFIGURATION:', error.message);
    console.log('\n🔧 VÉRIFICATIONS:');
    console.log('1. Le script SQL a-t-il été exécuté dans Supabase ?');
    console.log('2. Votre mot de passe est-il correct ?');
    console.log('3. Votre projet Supabase est-il actif ?');
  }
}

setupSupabaseDatabase();
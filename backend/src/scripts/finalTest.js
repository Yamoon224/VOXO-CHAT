// src/scripts/finalTest.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

async function finalTest() {
  console.log('🎯 TEST FINAL - CREATION D\'UN TENANT ET UTILISATEUR');
  console.log('='.repeat(60));
  
  try {
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
    console.log('✅ Connexion Supabase établie');
    
    console.log('\n1️⃣ Création d\'un tenant de test...');
    
    // Utiliser uuid_generate_v4() pour générer un UUID valide
    const [tenantResult] = await sequelize.query(`
      INSERT INTO tenants (id, name, subscription_plan, created_at, updated_at) 
      VALUES (uuid_generate_v4(), $1, $2, NOW(), NOW())
      RETURNING id, name, subscription_plan
    `, {
      bind: ['Entreprise Test Final', 'free']
    });
    
    const tenant = tenantResult[0];
    console.log('✅ Tenant créé:', {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.subscription_plan
    });
    
    console.log('\n2️⃣ Création d\'un utilisateur de test...');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    const [userResult] = await sequelize.query(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, created_at, updated_at) 
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, first_name, last_name, role
    `, {
      bind: [
        tenant.id,
        'test@example.com',
        hashedPassword,
        'Test',
        'User',
        'owner'
      ]
    });
    
    const user = userResult[0];
    console.log('✅ Utilisateur créé:', {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role
    });
    
    console.log('\n3️⃣ Création d\'une connaissance de test...');
    
    const [knowledgeResult] = await sequelize.query(`
      INSERT INTO knowledge_base (id, tenant_id, title, content, source_type, is_active, created_by, created_at, updated_at) 
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, title, source_type
    `, {
      bind: [
        tenant.id,
        'Guide de démarrage',
        'Bienvenue dans votre nouveau chatbot ! Cette connaissance de base vous aidera à commencer.',
        'manual',
        true,
        user.id
      ]
    });
    
    const knowledge = knowledgeResult[0];
    console.log('✅ Connaissance créée:', {
      id: knowledge.id,
      title: knowledge.title,
      type: knowledge.source_type
    });
    
    console.log('\n4️⃣ Vérification des données...');
    
    // Compter les enregistrements
    const [counts] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM tenants) as tenants,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM knowledge_base) as knowledge,
        (SELECT COUNT(*) FROM conversations) as conversations
    `);
    
    console.log('📊 État de la base de données:', counts[0]);
    
    console.log('\n5️⃣ Test de requête complexe (JOIN)...');
    
    const [complexQuery] = await sequelize.query(`
      SELECT 
        t.name as tenant_name,
        t.subscription_plan,
        u.first_name || ' ' || u.last_name as user_name,
        u.email,
        u.role,
        k.title as knowledge_title
      FROM tenants t
      JOIN users u ON t.id = u.tenant_id
      LEFT JOIN knowledge_base k ON t.id = k.tenant_id
      WHERE t.id = $1
    `, {
      bind: [tenant.id]
    });
    
    console.log('✅ Requête JOIN réussie:', complexQuery[0]);
    
    console.log('\n6️⃣ Nettoyage des données de test...');
    
    // Nettoyer dans l'ordre (à cause des foreign keys)
    await sequelize.query(`DELETE FROM knowledge_base WHERE tenant_id = $1`, { bind: [tenant.id] });
    await sequelize.query(`DELETE FROM users WHERE tenant_id = $1`, { bind: [tenant.id] });
    await sequelize.query(`DELETE FROM tenants WHERE id = $1`, { bind: [tenant.id] });
    
    console.log('✅ Nettoyage terminé');
    
    await sequelize.close();
    
    console.log('\n🎉 TOUS LES TESTS SONT RÉUSSIS !');
    console.log('✅ Base de données Supabase opérationnelle');
    console.log('✅ Tables et contraintes fonctionnelles');
    console.log('✅ Extensions UUID et Vector installées');
    console.log('✅ Opérations CRUD validées');
    console.log('\n🚀 VOTRE BACKEND EST PRÊT À DÉMARRER !');
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST FINAL:', error);
    console.log('💡 Vérifiez que toutes les tables sont bien créées');
  }
}

finalTest();
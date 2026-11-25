// src/scripts/testDatabase.js
const { sequelize, Tenant, User, KnowledgeBase, Conversation } = require('../models');

const testDatabase = async () => {
  try {
    console.log('🧪 Test de la base de données...');
    
    // Forcer la recréation des tables
    console.log('🔄 Synchronisation forcée...');
    await sequelize.sync({ force: true });
    
    console.log('✅ Tables créées avec succès!');
    
    // Créer un tenant de test
    console.log('👤 Création d\'un tenant de test...');
    const tenant = await Tenant.create({
      name: 'Test Company',
      subdomain: 'test',
      domain: 'test.localhost',
      subscriptionPlan: 'basic', // Test de l'ENUM
    });
    
    console.log('✅ Tenant créé:', tenant.toJSON());
    
    // Créer un utilisateur de test
    console.log('👤 Création d\'un utilisateur de test...');
    const user = await User.create({
      tenantId: tenant.id,
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'Test',
      role: 'owner', // Test de l'ENUM
    });
    
    console.log('✅ Utilisateur créé:', user.toJSON());
    
    // Créer une entrée de knowledge base
    console.log('📚 Création d\'une entrée knowledge base...');
    const knowledge = await KnowledgeBase.create({
      tenantId: tenant.id,
      title: 'Question de test',
      content: 'Ceci est une réponse de test.',
      sourceType: 'manual', // Test de l'ENUM
      createdBy: user.id,
    });
    
    console.log('✅ Knowledge base créée:', knowledge.toJSON());
    
    // Créer une conversation
    console.log('💬 Création d\'une conversation...');
    const conversation = await Conversation.create({
      tenantId: tenant.id,
      sessionId: 'test-session-123',
      userId: 'anonymous-user',
      status: 'active', // Test de l'ENUM
      messages: [
        { role: 'user', content: 'Bonjour!', timestamp: new Date() },
        { role: 'assistant', content: 'Bonjour! Comment puis-je vous aider?', timestamp: new Date() }
      ],
    });
    
    console.log('✅ Conversation créée:', conversation.toJSON());
    
    console.log('\n🎉 Tous les tests sont passés!');
    console.log('\n🎯 Pour tester l\'API:');
    console.log(`curl -H "X-Tenant-ID: ${tenant.id}" http://localhost:3000/api/tenant/test`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
};

testDatabase();

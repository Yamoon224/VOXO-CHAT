const { sequelize, Tenant, User, KnowledgeBase, Conversation } = require('../models');

async function showDatabase() {
  console.log('🗄️  BASE DE DONNÉES CHATBOT\n');
  
  try {
    // Test connexion
    await sequelize.authenticate();
    console.log('✅ Connexion PostgreSQL OK\n');
    
    // Compter les enregistrements
    const stats = {
      tenants: await Tenant.count(),
      users: await User.count(), 
      knowledge: await KnowledgeBase.count(),
      conversations: await Conversation.count()
    };
    
    console.log('📊 STATISTIQUES:');
    console.log(`   🏢 Entreprises: ${stats.tenants}`);
    console.log(`   👥 Utilisateurs: ${stats.users}`);
    console.log(`   📚 Connaissances: ${stats.knowledge}`);
    console.log(`   💬 Conversations: ${stats.conversations}\n`);
    
    // Afficher les tenants
    if (stats.tenants > 0) {
      console.log('🏢 ENTREPRISES:');
      const tenants = await Tenant.findAll({ limit: 10 });
      tenants.forEach(t => {
        console.log(`   • ${t.name} (${t.subscriptionPlan}) - ${t.isActive ? 'Actif' : 'Inactif'}`);
      });
      console.log('');
    }
    
    // Afficher les utilisateurs
    if (stats.users > 0) {
      console.log('👥 UTILISATEURS:');
      const users = await User.findAll({ 
        include: [{ model: Tenant, as: 'tenant' }],
        limit: 10 
      });
      users.forEach(u => {
        console.log(`   • ${u.firstName} ${u.lastName} (${u.email}) - ${u.role}`);
        console.log(`     Entreprise: ${u.tenant?.name || 'N/A'}`);
      });
      console.log('');
    }
    
    // Afficher les conversations récentes
    if (stats.conversations > 0) {
      console.log('💬 CONVERSATIONS RÉCENTES:');
      const conversations = await Conversation.findAll({ 
        include: [{ model: Tenant, as: 'tenant' }],
        order: [['updatedAt', 'DESC']],
        limit: 5 
      });
      conversations.forEach(c => {
        console.log(`   • Session: ${c.sessionId.substring(0, 8)}... (${c.messages?.length || 0} messages)`);
        console.log(`     Entreprise: ${c.tenant?.name || 'N/A'} - ${c.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  
  process.exit(0);
}

showDatabase();

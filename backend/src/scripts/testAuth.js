// Crée ce fichier : backend/src/scripts/testAuth.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Données de test
const testData = {
  companyName: 'Test Company',
  subdomain: 'testcompany123',
  firstName: 'John',
  lastName: 'Doe',
  email: `test${Date.now()}@example.com`, // Email unique
  password: 'TestPassword123!',
  confirmPassword: 'TestPassword123!'
};

const testAuth = async () => {
  console.log('🧪 Test des routes d\'authentification...\n');

  try {
    // 1. Test de l'inscription
    console.log('📝 Test inscription...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testData);
    
    console.log('✅ Inscription réussie');
    console.log('👤 Utilisateur:', registerResponse.data.data.user.email);
    console.log('🏢 Tenant:', registerResponse.data.data.tenant.name);
    
    const { accessToken } = registerResponse.data.data.tokens;
    
    // 2. Test récupération du profil
    console.log('\n👤 Test récupération du profil...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    console.log('✅ Profil récupéré');
    console.log('📧 Email:', profileResponse.data.data.user.email);
    console.log('🆔 Role:', profileResponse.data.data.user.role);
    
    console.log('\n🎉 Tests d\'authentification réussis !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
};

// Fonction utilitaire pour tester si le serveur est démarré
const checkServerHealth = async () => {
  try {
    console.log('🔍 Vérification du serveur...');
    await axios.get('http://localhost:3000/health', {
      timeout: 5000 // 5 secondes de timeout
    });
    console.log('✅ Serveur disponible');
    return true;
  } catch (error) {
    console.error('❌ Serveur non disponible:', error.message);
    console.error('💡 Assure-toi qu\'il est démarré avec `npm run dev`');
    return false;
  }
};

// Exécution principal
const main = async () => {
  console.log('🚀 Démarrage des tests d\'authentification\n');
  
  const serverReady = await checkServerHealth();
  if (!serverReady) {
    process.exit(1);
  }
  
  await testAuth();
};

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { testAuth };

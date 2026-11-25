// src/scripts/testKnowledge.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

class KnowledgeTester {
  constructor() {
    this.tenant = null;
    this.accessToken = null;
    this.knowledgeItems = [];
  }

  async setupTestEnvironment() {
    console.log('🔧 Configuration environnement de test...');
    
    try {
      // Créer un compte de test
      const registerData = {
        companyName: 'Knowledge Test Co',
        subdomain: `knowledge${Date.now()}`,
        firstName: 'Test',
        lastName: 'Knowledge',
        email: `knowledge.test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      };

      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
      this.tenant = registerResponse.data.data.tenant;
      this.accessToken = registerResponse.data.data.tokens.accessToken;
      
      console.log('✅ Environnement créé');
      console.log(`   Tenant: ${this.tenant.name}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur configuration:', error.response?.data || error.message);
      return false;
    }
  }

  async testCreateKnowledge() {
    console.log('\n📝 Test création de connaissance...');
    
    try {
      const knowledgeData = {
        title: 'Comment nous contacter',
        content: 'Vous pouvez nous contacter par téléphone au 01 23 45 67 89, par email à contact@example.com, ou via notre chat en ligne disponible 24h/7j.',
        sourceType: 'manual',
        tags: ['contact', 'support', 'information'],
        metadata: {
          category: 'support',
          priority: 'high'
        }
      };

      const response = await axios.post(`${BASE_URL}/knowledge`, knowledgeData, {
        headers: { 
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Tenant-ID': this.tenant.id 
        }
      });
      
      console.log('✅ Connaissance créée');
      console.log(`   ID: ${response.data.data.id}`);
      console.log(`   Titre: ${response.data.data.title}`);
      
      this.knowledgeItems.push(response.data.data);
      return true;
    } catch (error) {
      console.error('❌ Erreur création:', error.response?.data || error.message);
      return false;
    }
  }

  async testBulkImport() {
    console.log('\n📚 Test import en lot...');
    
    try {
      const bulkData = {
        knowledgeItems: [
          {
            title: 'Horaires d\'ouverture',
            content: 'Nous sommes ouverts du lundi au vendredi de 9h à 18h, et le samedi de 10h à 16h.',
            tags: ['horaires', 'information'],
            sourceType: 'manual'
          },
          {
            title: 'Politique de retour',
            content: 'Les retours sont acceptés dans les 30 jours suivant l\'achat, avec la facture originale.',
            tags: ['retour', 'politique'],
            sourceType: 'manual'
          },
          {
            title: 'Nos services',
            content: 'Nous offrons des services de conseil, développement web, et support technique.',
            tags: ['services', 'offres'],
            sourceType: 'manual'
          }
        ]
      };

      const response = await axios.post(`${BASE_URL}/knowledge/bulk-import`, bulkData, {
        headers: { 
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Tenant-ID': this.tenant.id 
        }
      });
      
      console.log('✅ Import en lot réussi');
      console.log(`   Importés: ${response.data.data.imported}`);
      console.log(`   Erreurs: ${response.data.data.errors.length}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur import:', error.response?.data || error.message);
      return false;
    }
  }

  async testSearchKnowledge() {
    console.log('\n🔍 Test recherche de connaissances...');
    
    try {
      const response = await axios.get(`${BASE_URL}/knowledge/search?q=contact`, {
        headers: { 
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Tenant-ID': this.tenant.id 
        }
      });
      
      console.log('✅ Recherche effectuée');
      console.log(`   Résultats: ${response.data.data.length}`);
      
      if (response.data.data.length > 0) {
        const firstResult = response.data.data[0];
        console.log(`   Premier: "${firstResult.title}" (similarité: ${firstResult.similarity})`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erreur recherche:', error.response?.data || error.message);
      return false;
    }
  }

  async testGetKnowledgeBase() {
    console.log('\n📋 Test liste base de connaissances...');
    
    try {
      const response = await axios.get(`${BASE_URL}/knowledge?page=1&limit=10`, {
        headers: { 
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Tenant-ID': this.tenant.id 
        }
      });
      
      console.log('✅ Liste récupérée');
      console.log(`   Total: ${response.data.data.length}`);
      console.log(`   Pagination: ${response.data.pagination.total} éléments total`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur liste:', error.response?.data || error.message);
      return false;
    }
  }

  async testUpdateKnowledge() {
    console.log('\n✏️  Test mise à jour connaissance...');
    
    if (this.knowledgeItems.length === 0) {
      console.log('⚠️  Aucune connaissance à mettre à jour');
      return false;
    }
    
    try {
      const itemId = this.knowledgeItems[0].id;
      const updateData = {
        title: 'Comment nous contacter - Mis à jour',
        content: 'MISE À JOUR: Vous pouvez nous contacter par téléphone au 01 23 45 67 89, par email à contact@example.com, via notre chat en ligne 24h/7j, ou sur nos réseaux sociaux.',
        tags: ['contact', 'support', 'information', 'mise-à-jour']
      };

      const response = await axios.put(`${BASE_URL}/knowledge/${itemId}`, updateData, {
        headers: { 
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Tenant-ID': this.tenant.id 
        }
      });
      
      console.log('✅ Connaissance mise à jour');
      console.log(`   Nouveau titre: ${response.data.data.title}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour:', error.response?.data || error.message);
      return false;
    }
  }

  async testGetStats() {
    console.log('\n📊 Test statistiques...');
    
    try {
      const response = await axios.get(`${BASE_URL}/knowledge/stats`, {
        headers: { 
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Tenant-ID': this.tenant.id 
        }
      });
      
      console.log('✅ Statistiques récupérées');
      console.log(`   Total: ${response.data.data.total}`);
      console.log(`   Actifs: ${response.data.data.active}`);
      console.log(`   Avec embedding: ${response.data.data.withEmbedding}`);
      console.log(`   Couverture embedding: ${response.data.data.embeddingCoverage}%`);
      
      return true;
    } catch (error) {
      console.error('❌ Erreur stats:', error.response?.data || error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 TESTS DE LA BASE DE CONNAISSANCES\n');
    
    const tests = [
      { name: 'Configuration environnement', fn: this.setupTestEnvironment },
      { name: 'Création connaissance', fn: this.testCreateKnowledge },
      { name: 'Import en lot', fn: this.testBulkImport },
      { name: 'Recherche connaissances', fn: this.testSearchKnowledge },
      { name: 'Liste base connaissances', fn: this.testGetKnowledgeBase },
      { name: 'Mise à jour connaissance', fn: this.testUpdateKnowledge },
      { name: 'Statistiques', fn: this.testGetStats },
    ];

    const results = [];
    
    for (const test of tests) {
      try {
        const result = await test.fn.call(this);
        results.push({ name: test.name, success: result });
      } catch (error) {
        console.error(`❌ Erreur dans ${test.name}:`, error.message);
        results.push({ name: test.name, success: false });
      }
    }

    // Résumé
    console.log('\n📊 RÉSUMÉ DES TESTS');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
    });
    
    console.log('='.repeat(50));
    console.log(`Réussis: ${successful}/${total} (${Math.round(successful/total*100)}%)`);
    
    if (successful === total) {
      console.log('🎉 Tous les tests de base de connaissances sont passés !');
    } else {
      console.log('⚠️  Certains tests ont échoué.');
    }
  }
}

if (require.main === module) {
  const tester = new KnowledgeTester();
  tester.runAllTests().catch(console.error);
}

module.exports = KnowledgeTester;
#!/usr/bin/env node

// Test de connexion Supabase avec différentes méthodes
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

console.log('🔍 Test de connexion Supabase - Diagnostic complet\n');

// Configuration depuis .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;

console.log('📋 Configuration détectée:');
console.log(`   SUPABASE_URL: ${supabaseUrl}`);
console.log(`   SUPABASE_ANON_KEY: ${supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NON DÉFINIE'}`);
console.log(`   DATABASE_URL: ${databaseUrl ? `${databaseUrl.substring(0, 50)}...` : 'NON DÉFINIE'}\n`);

// Test 1: Connexion via le client Supabase
async function testSupabaseClient() {
  console.log('🧪 Test 1: Connexion via le client Supabase...');
  
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('URL ou clé Supabase manquante');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test simple de requête
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
    } else {
      console.log('   ✅ Connexion Supabase réussie!');
      console.log(`   📊 Résultat: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`   ❌ Échec: ${error.message}`);
  }
  console.log('');
}

// Test 2: Connexion directe PostgreSQL
async function testDirectConnection() {
  console.log('🧪 Test 2: Connexion directe PostgreSQL...');
  
  try {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    const client = await pool.connect();
    console.log('   ✅ Connexion PostgreSQL directe réussie!');
    
    // Test de requête simple
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`   🕐 Heure serveur: ${result.rows[0].current_time}`);
    
    // Vérifier les tables existantes
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`   📋 Tables trouvées (${tables.rows.length}):`);
    tables.rows.forEach(row => {
      console.log(`      • ${row.tablename}`);
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.log(`   ❌ Échec: ${error.message}`);
    
    // Analyser l'erreur
    if (error.message.includes('Tenant or user not found')) {
      console.log('\n🔍 DIAGNOSTIC:');
      console.log('   Cette erreur indique que les identifiants de connexion sont incorrects.');
      console.log('   Causes possibles:');
      console.log('   • Le mot de passe a été modifié dans Supabase');
      console.log('   • L\'utilisateur a été supprimé');
      console.log('   • La base de données a été supprimée');
      console.log('   • L\'URL de connexion est incorrecte');
      console.log('\n💡 SOLUTIONS:');
      console.log('   1. Vérifiez vos identifiants dans le dashboard Supabase');
      console.log('   2. Régénérez le mot de passe de la base de données');
      console.log('   3. Mettez à jour le fichier .env avec les nouveaux identifiants');
    }
  }
  console.log('');
}

// Test 3: Validation des variables d'environnement
async function validateEnvironment() {
  console.log('🧪 Test 3: Validation de l\'environnement...');
  
  const requiredVars = [
    'DATABASE_URL',
    'SUPABASE_URL', 
    'SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`   ❌ Variables manquantes: ${missingVars.join(', ')}`);
  } else {
    console.log('   ✅ Toutes les variables requises sont présentes');
  }
  
  // Analyser l'URL de la base de données
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      console.log('   📋 Analyse de DATABASE_URL:');
      console.log(`      • Protocole: ${url.protocol}`);
      console.log(`      • Host: ${url.hostname}`);
      console.log(`      • Port: ${url.port}`);
      console.log(`      • Database: ${url.pathname.slice(1)}`);
      console.log(`      • Username: ${url.username}`);
      console.log(`      • Password: ${url.password ? '[MASQUÉ]' : 'NON DÉFINI'}`);
    } catch (error) {
      console.log(`   ❌ URL de base de données invalide: ${error.message}`);
    }
  }
  console.log('');
}

// Exécution des tests
async function runAllTests() {
  await validateEnvironment();
  await testSupabaseClient();
  await testDirectConnection();
  
  console.log('🏁 Tests terminés.\n');
  console.log('📝 ÉTAPES SUIVANTES:');
  console.log('   1. Si les tests échouent, vérifiez votre dashboard Supabase');
  console.log('   2. Copiez les nouveaux identifiants de connexion');
  console.log('   3. Mettez à jour le fichier .env');
  console.log('   4. Relancez npm run dev');
  
  process.exit(0);
}

runAllTests().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
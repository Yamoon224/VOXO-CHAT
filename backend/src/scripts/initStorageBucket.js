// src/scripts/initStorageBucket.js
// Crée le bucket privé Supabase Storage utilisé pour les fichiers uploadés.
// Idempotent : à relancer sans risque après un changement d'environnement.
//   node src/scripts/initStorageBucket.js
const path = require('path');

// Chemin explicite : config.js appelle dotenv.config() sans `path`, donc le .env
// serait résolu depuis le répertoire courant. On veut un script exécutable de partout.
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');
const { MAX_FILE_BYTES } = require('../config/fileUploads');

async function main() {
  const { url, serviceRoleKey } = config.supabase;

  if (!url || !serviceRoleKey) {
    console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
    return false;
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const name = config.storage.bucket;

  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) throw new Error(`Impossible de lister les buckets : ${listError.message}`);

  if (buckets.some(bucket => bucket.name === name)) {
    console.log(`✅ Le bucket « ${name} » existe déjà, rien à faire.`);
    return true;
  }

  // Bucket privé : la seule voie de lecture est une URL signée générée par
  // storageService, jamais un accès public direct.
  const { error } = await client.storage.createBucket(name, {
    public: false,
    fileSizeLimit: MAX_FILE_BYTES
  });
  if (error) throw new Error(`Création du bucket échouée : ${error.message}`);

  console.log(`✅ Bucket privé « ${name} » créé (limite ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} Mo).`);
  return true;
}

main()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(`\n❌ ${error.message}`);
    process.exit(1);
  });

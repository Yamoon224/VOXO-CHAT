// src/scripts/createSuperAdmin.js
// Crée le tout premier compte super administrateur de la plateforme.
// Aucune invitation n'est possible tant qu'aucun super administrateur n'existe.
//   node src/scripts/createSuperAdmin.js <email> <motDePasse> <prénom> <nom>
// ou via SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_FIRST_NAME / SUPER_ADMIN_LAST_NAME
const path = require('path');

// Chemin explicite : config.js appelle dotenv.config() sans `path`, donc le .env
// serait résolu depuis le répertoire courant. On veut un script exécutable de partout.
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize, AdminRole, AdminUser } = require('../models');
const { adminLoginSchema } = require('../validators/adminValidators');

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function readCredentials() {
  const [email, password, firstName, lastName] = process.argv.slice(2);
  return {
    email: (email || process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase(),
    password: password || process.env.SUPER_ADMIN_PASSWORD || '',
    firstName: (firstName || process.env.SUPER_ADMIN_FIRST_NAME || '').trim(),
    lastName: (lastName || process.env.SUPER_ADMIN_LAST_NAME || '').trim(),
  };
}

function assertCredentials({ email, password, firstName, lastName }) {
  if (!email || !password || !firstName || !lastName) {
    throw new Error('Email, mot de passe, prénom et nom sont tous requis');
  }
  // Même règle que la route de connexion : sans ça, on créerait un compte que
  // son propriétaire ne pourrait jamais utiliser (ex: domaine en .test).
  const { error } = adminLoginSchema.validate({ email, password: 'placeholder' });
  if (error) {
    throw new Error(error.details.map(detail => detail.message).join(', '));
  }
  if (!PASSWORD_PATTERN.test(password)) {
    throw new Error(
      'Le mot de passe doit faire 8 caractères minimum et contenir une minuscule, une majuscule, un chiffre et un caractère spécial'
    );
  }
}

async function main() {
  await sequelize.authenticate();

  const systemRole = await AdminRole.findOne({ where: { isSystem: true } });
  if (!systemRole) {
    throw new Error('Rôle système introuvable : appliquez les migrations (npm run db:migrate)');
  }

  const existing = await AdminUser.count({ where: { roleId: systemRole.id } });
  if (existing > 0) {
    console.log('ℹ️  Un super administrateur existe déjà : aucune action.');
    console.log('   Les comptes suivants se créent par invitation depuis /admin/accounts.');
    return;
  }

  const credentials = readCredentials();
  assertCredentials(credentials);

  const admin = await AdminUser.create({ ...credentials, roleId: systemRole.id });
  console.log('✅ Super administrateur créé');
  console.log(`   email .... ${admin.email}`);
  console.log(`   rôle ..... ${systemRole.name}`);
}

main()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`\n❌ Création impossible : ${error.message}`);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });

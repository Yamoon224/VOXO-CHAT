// src/scripts/checkEmailConfig.js
// Diagnostic en LECTURE SEULE de la configuration d'envoi d'emails.
// N'envoie aucun email : interroge uniquement /v3/account et /v3/senders.
const path = require('path');

// Chemin explicite : config.js appelle dotenv.config() sans `path`, donc le .env
// serait résolu depuis le répertoire courant. On veut un script exécutable de partout.
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = require('../config/config');

const ACCOUNT_ENDPOINT = 'https://api.brevo.com/v3/account';
const SENDERS_ENDPOINT = 'https://api.brevo.com/v3/senders';

function maskKey(apiKey) {
  if (!apiKey) return 'MANQUANT';
  return `défini (${apiKey.slice(0, 8)}…, ${apiKey.length} caractères)`;
}

async function brevoGet(url, apiKey) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json', 'api-key': apiKey },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, body };
}

function printLocalConfig() {
  const { provider, brevo } = config.email;
  console.log('[1/3] Configuration locale');
  console.log(`   provider ............ ${provider}`);
  console.log(`   BREVO_API_KEY ....... ${maskKey(brevo.apiKey)}`);
  console.log(`   BREVO_SENDER_EMAIL .. ${brevo.senderEmail || 'MANQUANT'}`);
  console.log(`   BREVO_SENDER_NAME ... ${brevo.senderName}`);

  if (provider !== 'brevo') {
    console.log(`\n⚠️  EMAIL_PROVIDER vaut "${provider}" : ce script ne diagnostique que Brevo.`);
    return false;
  }
  if (!brevo.apiKey || !brevo.senderEmail) {
    console.log('\n❌ VERDICT : configuration incomplète.');
    console.log('   Renseigne BREVO_API_KEY et BREVO_SENDER_EMAIL dans backend/.env.');
    return false;
  }
  return true;
}

async function checkAccount(apiKey) {
  console.log('\n[2/3] GET /v3/account (validité de la clé API)');
  const { status, ok, body } = await brevoGet(ACCOUNT_ENDPOINT, apiKey);
  console.log(`   HTTP ${status}`);

  if (ok) {
    console.log(`   ✅ Clé valide — compte : ${body.email || '(email inconnu)'}`);
    if (body.plan) console.log(`   plan : ${JSON.stringify(body.plan)}`);
    return true;
  }

  console.log(`   ❌ ${JSON.stringify(body)}`);
  const message = `${body.message || ''}`.toLowerCase();

  console.log('\n❌ VERDICT : Brevo rejette la clé API.');
  if (message.includes('ip')) {
    console.log('   Cause : l’IP de cette machine n’est pas autorisée pour cette clé.');
    console.log('   Action : Brevo → SMTP & API → API keys → autoriser cette IP');
    console.log('            (ou désactiver la restriction d’IP sur la clé).');
  } else {
    console.log('   Cause : clé révoquée, tronquée, ou issue d’un autre compte.');
    console.log('   Action : régénère la clé dans Brevo → SMTP & API → API keys,');
    console.log('            puis mets à jour BREVO_API_KEY dans backend/.env.');
  }
  return false;
}

async function checkSender(apiKey, senderEmail) {
  console.log('\n[3/3] GET /v3/senders (validation de l’expéditeur)');
  const { status, ok, body } = await brevoGet(SENDERS_ENDPOINT, apiKey);
  console.log(`   HTTP ${status}`);

  if (!ok) {
    console.log(`   ❌ ${JSON.stringify(body)}`);
    return false;
  }

  const senders = body.senders || [];
  senders.forEach(sender => {
    const state = sender.active ? 'validé' : 'NON validé';
    console.log(`   - ${sender.email} (${state})`);
  });
  if (!senders.length) console.log('   (aucun expéditeur déclaré sur ce compte)');

  const match = senders.find(
    sender => `${sender.email}`.toLowerCase() === `${senderEmail}`.toLowerCase()
  );

  if (match && match.active) {
    console.log(`\n✅ VERDICT : "${senderEmail}" est un expéditeur validé et la clé fonctionne.`);
    console.log('   ⚠️  Ces deux contrôles ne couvrent pas l’activation du compte transactionnel :');
    console.log('   un compte Brevo neuf renvoie 403 "SMTP account is not yet activated" sur');
    console.log('   /v3/smtp/email tant que Brevo ne l’a pas débloqué (contact@brevo.com).');
    console.log('   En cas d’échec, le champ "reason" du log email.failed donne la réponse exacte.');
    return true;
  }

  console.log(`\n❌ VERDICT : "${senderEmail}" n’est pas un expéditeur utilisable.`);
  console.log(`   Cause : ${match ? 'expéditeur déclaré mais non validé' : 'expéditeur inconnu du compte'}.`);
  console.log('   Brevo répond alors 400 "Invalid sender" sur /v3/smtp/email.');
  console.log('   Action : Brevo → Senders & IP → Senders : valide cette adresse,');
  console.log('            ou aligne BREVO_SENDER_EMAIL sur un expéditeur déjà validé ci-dessus.');
  return false;
}

async function main() {
  console.log('🔍 Diagnostic de la configuration email (aucun email ne sera envoyé)\n');

  if (!printLocalConfig()) return false;

  const { apiKey, senderEmail } = config.email.brevo;
  if (!(await checkAccount(apiKey))) return false;

  return checkSender(apiKey, senderEmail);
}

main()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(`\n❌ Le diagnostic a échoué : ${error.message}`);
    console.error('   Brevo est-il joignable depuis cette machine (proxy, pare-feu, DNS) ?');
    process.exit(1);
  });

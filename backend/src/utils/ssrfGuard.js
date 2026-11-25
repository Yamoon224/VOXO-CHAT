// Empêche les actions agent (URL configurée par un tenant) d'atteindre un
// service interne à l'infra voxo-chat. Appelé à la sauvegarde ET à
// l'exécution (defense in depth : la résolution DNS peut changer entre les
// deux, cf. DNS rebinding).
const dns = require('dns').promises;
const { AppError } = require('../middleware/errorMiddleware');
const { isPrivateIp } = require('../services/clientContextService');

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function rejectUrl(message) {
  throw new AppError(message, 400, { code: 'AGENT_ACTION_URL_FORBIDDEN' });
}

async function assertPublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    rejectUrl("L'URL de l'action n'est pas valide.");
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    rejectUrl('Seules les URL http:// ou https:// sont autorisées.');
  }
  if (parsed.hostname === 'localhost') {
    rejectUrl('Cette URL pointe vers une ressource interne, ce qui est interdit.');
  }

  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    rejectUrl("Le nom d'hôte de l'URL est introuvable.");
  }

  if (addresses.some(address => isPrivateIp(address.address))) {
    rejectUrl('Cette URL pointe vers une ressource interne, ce qui est interdit.');
  }
}

module.exports = { assertPublicUrl };

// Sockets de VISITEUR actuellement ouverts, par conversation. Le topic d'événements est partagé avec
// l'inbox des conseillers : on ne peut donc pas s'en servir pour savoir si l'app du visiteur est ouverte.
// Compteur local à l'instance : avec plusieurs instances, une push peut partir alors que l'app est
// ouverte ailleurs — doublon sans gravité, l'app hôte n'affiche pas de notification au premier plan.
const counts = new Map();
const key = (tenantId, sessionId) => `${tenantId}:${sessionId}`;

function add(tenantId, sessionId) {
  counts.set(key(tenantId, sessionId), (counts.get(key(tenantId, sessionId)) || 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = (counts.get(key(tenantId, sessionId)) || 1) - 1;
    if (next <= 0) counts.delete(key(tenantId, sessionId)); else counts.set(key(tenantId, sessionId), next);
  };
}

function has(tenantId, sessionId) { return (counts.get(key(tenantId, sessionId)) || 0) > 0; }

module.exports = { add, has };

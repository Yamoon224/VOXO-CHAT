/**
 * Fenêtre de rétention d'un compte supprimé.
 *
 * La suppression est immédiate du point de vue de l'utilisateur (connexion
 * refusée, email libéré) mais la ligne survit `RETENTION_DAYS` jours pour la
 * conservation légale et l'audit, avant purge définitive par
 * `scripts/purgeDeletedAccounts.js`.
 */
const RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Date à laquelle un compte supprimé à `deletedAt` sera effacé définitivement. */
function computePurgeAt(deletedAt = new Date()) {
  return new Date(deletedAt.getTime() + RETENTION_DAYS * MS_PER_DAY);
}

/** Seuil en deçà duquel un `deleted_at` est éligible à la purge. */
function computePurgeCutoff(now = new Date()) {
  return new Date(now.getTime() - RETENTION_DAYS * MS_PER_DAY);
}

/** Date lisible pour les emails destinés à l'utilisateur final. */
function formatPurgeDate(purgeAt, locale = 'fr') {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(purgeAt);
}

module.exports = {
  RETENTION_DAYS,
  computePurgeAt,
  computePurgeCutoff,
  formatPurgeDate,
};

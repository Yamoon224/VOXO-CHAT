const { sequelize } = require('../models');
const satisfaction = require('./satisfactionStats');
const { PERIOD_DAYS, buildWindow } = require('./statsWindow');

/**
 * Agrégats de la plateforme, toutes entreprises confondues.
 *
 * Volontairement transverse aux tenants — c'est tout l'objet du module — donc
 * aucune requête ne porte de filtre `tenantId`. L'accès est gardé en amont par
 * `authenticateAdmin` + `requireAdminPermission('stats', …)`.
 *
 * PIÈGE CENTRAL : `Conversation` n'est pas `paranoid` et la suppression d'un
 * tenant est douce, donc la cascade `ON DELETE CASCADE` ne se déclenche jamais.
 * Les conversations d'une entreprise supprimée SURVIVENT en base. Chaque
 * requête ci-dessous joint donc `Tenant` sur `deleted_at IS NULL` — une
 * jointure interne, jamais un LEFT JOIN filtré, qui masquerait les orphelins.
 * En SQL brut sur `"User"`, la portée `paranoid` de l'ORM est également perdue :
 * `u.deleted_at IS NULL` doit être écrit à la main.
 */

const select = (sql, replacements = {}) => sequelize.query(sql, {
  replacements,
  type: sequelize.QueryTypes.SELECT,
});

const toInt = value => Number.parseInt(value, 10) || 0;

class PlatformStatsService {
  /** Fenêtre [from, to[ en UTC — voir `statsWindow`, partagé avec le tenant. */
  buildWindow(period = '30d') {
    return buildWindow(period);
  }

  /** Entreprises et utilisateurs, hors comptes supprimés. */
  async getAccountTotals() {
    const [row] = await select(`
      SELECT
        (SELECT COUNT(*) FROM "Tenant" WHERE deleted_at IS NULL) AS tenants,
        (SELECT COUNT(*) FROM "Tenant" WHERE deleted_at IS NULL AND is_active = true) AS active_tenants,
        (SELECT COUNT(*) FROM "User" u
           JOIN "Tenant" t ON t.id = u.tenant_id AND t.deleted_at IS NULL
          WHERE u.deleted_at IS NULL) AS users
    `);

    return {
      tenants: toInt(row.tenants),
      activeTenants: toInt(row.active_tenants),
      users: toInt(row.users),
    };
  }

  /**
   * Chatbot actif = entreprise non bloquée, non supprimée, ET ayant échangé au
   * moins une conversation sur la période. Une entreprise inscrite qui n'a
   * jamais rien configuré ne compte pas.
   */
  async getActiveChatbots({ from, to }) {
    const [row] = await select(`
      SELECT COUNT(DISTINCT c.tenant_id) AS active_chatbots
        FROM "Conversation" c
        JOIN "Tenant" t ON t.id = c.tenant_id AND t.deleted_at IS NULL
       WHERE t.is_active = true
         AND c.created_at >= :from AND c.created_at < :to
    `, { from, to });

    return toInt(row.active_chatbots);
  }

  async getConversationTotals({ from, to }) {
    const [row] = await select(`
      SELECT
        COUNT(*) AS conversations,
        COALESCE(SUM(jsonb_array_length(c.messages)), 0) AS messages
        FROM "Conversation" c
        JOIN "Tenant" t ON t.id = c.tenant_id AND t.deleted_at IS NULL
       WHERE c.created_at >= :from AND c.created_at < :to
    `, { from, to });

    return { conversations: toInt(row.conversations), messages: toInt(row.messages) };
  }

  /** Satisfaction globale : mêmes filtre et formule que le tableau de bord tenant. */
  async getSatisfaction({ from, to }) {
    const rows = await select(`
      SELECT ${satisfaction.SENTIMENT_EXPRESSION} AS sentiment, COUNT(*) AS count
        FROM "Conversation" c
        JOIN "Tenant" t ON t.id = c.tenant_id AND t.deleted_at IS NULL
       WHERE c.created_at >= :from AND c.created_at < :to
         AND ${satisfaction.SENTIMENT_FILTER}
       GROUP BY 1
    `, { from, to });

    const [ratingRow] = await select(`
      SELECT AVG(c.satisfaction_rating) AS avg_rating
        FROM "Conversation" c
        JOIN "Tenant" t ON t.id = c.tenant_id AND t.deleted_at IS NULL
       WHERE c.created_at >= :from AND c.created_at < :to
         AND c.satisfaction_rating IS NOT NULL
    `, { from, to });

    return {
      ...satisfaction.summarize(rows),
      averageRating: satisfaction.averageRating(ratingRow?.avg_rating),
    };
  }

  /**
   * Série journalière des conversations.
   *
   * `generate_series` comble les jours sans données : Postgres ne renvoie
   * aucune ligne pour une journée vide, et le graphique compresserait l'axe.
   * Le prédicat porte sur la colonne brute, jamais sur `date_trunc(...)`, pour
   * rester indexable quand le volume le justifiera.
   */
  async getConversationTrend({ from, to }) {
    return select(`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
             COALESCE(COUNT(c.id), 0) AS conversations
        FROM generate_series(:from::date, (:to::date - INTERVAL '1 day'), INTERVAL '1 day') AS d(day)
        LEFT JOIN "Conversation" c
               ON c.created_at >= d.day
              AND c.created_at < d.day + INTERVAL '1 day'
              AND EXISTS (
                    SELECT 1 FROM "Tenant" t
                     WHERE t.id = c.tenant_id AND t.deleted_at IS NULL
                  )
       GROUP BY d.day
       ORDER BY d.day
    `, { from, to }).then(rows => rows.map(row => ({
      date: row.date,
      conversations: toInt(row.conversations),
    })));
  }
}

module.exports = new PlatformStatsService();
module.exports.PERIOD_DAYS = PERIOD_DAYS;

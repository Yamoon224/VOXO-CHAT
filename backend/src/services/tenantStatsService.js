const { sequelize, KnowledgeBase } = require('../models');
const satisfaction = require('./satisfactionStats');

/**
 * Agrégats du tableau de bord d'UNE entreprise.
 *
 * Miroir de `platformStatsService`, avec la propriété inverse : là où le
 * service plateforme est volontairement transverse et ne porte aucun filtre
 * `tenantId`, ICI CHAQUE REQUÊTE DOIT EN PORTER UN. Une requête qui l'oublie
 * ne renvoie pas une erreur — elle renvoie les chiffres de tous les clients au
 * client qui regarde. Les tests verrouillent ce filtre requête par requête.
 *
 * La jointure sur `Tenant` du service plateforme est inutile ici : le filtre
 * `tenant_id` désigne déjà une entreprise vivante, puisque c'est celle dont la
 * session est authentifiée.
 *
 * Les chiffres sont BORNÉS par la fenêtre. La version précédente comptait
 * depuis la création du compte sous un libellé « ce mois ».
 */

const select = (sql, replacements = {}) => sequelize.query(sql, {
  replacements,
  type: sequelize.QueryTypes.SELECT,
});

const toInt = value => Number.parseInt(value, 10) || 0;

/** Prédicat de fenêtre, sur la colonne brute pour rester indexable. */
const IN_WINDOW = 'c.tenant_id = :tenantId AND c.created_at >= :from AND c.created_at < :to';

/**
 * Horodatage d'un message, ou NULL.
 *
 * Postgres n'a pas de `TRY_CAST` : un `::timestamptz` direct ferait échouer
 * TOUTE la requête sur une seule valeur mal formée. Les messages d'avant
 * l'ajout du champ n'ont pas de clé `timestamp`, et rien ne garantit le format
 * de ceux importés depuis un canal externe. Le garde par expression régulière
 * écarte l'absence de clé, la chaîne vide et le texte libre.
 */
const MESSAGE_SENT_AT = `CASE WHEN m.value->>'timestamp' ~ '^\\d{4}-\\d{2}-\\d{2}T'
        THEN (m.value->>'timestamp')::timestamptz END`;

class TenantStatsService {
  /**
   * Série journalière des conversations.
   *
   * `generate_series` comble les jours sans données : Postgres ne renvoie
   * aucune ligne pour une journée vide, et le graphique compresserait l'axe.
   *
   * PIÈGE : `tenant_id` est dans la condition de JOIN, pas dans un WHERE. En
   * WHERE il éliminerait les lignes où le LEFT JOIN n'a rien trouvé, c'est-à-dire
   * exactement les jours vides que `generate_series` vient de fabriquer.
   */
  async getConversationTrend({ tenantId, from, to }) {
    const rows = await select(`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
             COUNT(c.id) AS conversations
        FROM generate_series(:from::date, (:to::date - INTERVAL '1 day'), INTERVAL '1 day') AS d(day)
        LEFT JOIN "Conversation" c
               ON c.tenant_id = :tenantId
              AND c.created_at >= d.day
              AND c.created_at < d.day + INTERVAL '1 day'
       GROUP BY d.day
       ORDER BY d.day
    `, { tenantId, from, to });

    return rows.map(row => ({ date: row.date, conversations: toInt(row.conversations) }));
  }

  /** Conversations et messages échangés sur la période. */
  async getConversationTotals({ tenantId, from, to }) {
    const [row] = await select(`
      SELECT COUNT(*) AS conversations,
             COALESCE(SUM(jsonb_array_length(c.messages)), 0) AS messages
        FROM "Conversation" c
       WHERE ${IN_WINDOW}
    `, { tenantId, from, to });

    return { conversations: toInt(row.conversations), messages: toInt(row.messages) };
  }

  /**
   * Visiteurs distincts.
   *
   * `session_id` est `NOT NULL` sur le modèle : la coalescence aboutit
   * toujours, un visiteur anonyme compte donc pour un. Remplace l'ancienne
   * « approximation » qui affichait purement et simplement le nombre de
   * conversations sous le libellé « utilisateurs uniques ».
   */
  async getUniqueVisitors({ tenantId, from, to }) {
    const [row] = await select(`
      SELECT COUNT(DISTINCT COALESCE(c.user_id, c.user_email, c.session_id)) AS visitors
        FROM "Conversation" c
       WHERE ${IN_WINDOW}
    `, { tenantId, from, to });

    return toInt(row.visitors);
  }

  /**
   * Délai de réponse du chatbot, en secondes.
   *
   * MÉDIANE et non moyenne : une conversation escaladée, où un humain répond
   * trois heures plus tard, suffirait à faire mentir une moyenne sur des
   * milliers d'échanges instantanés.
   *
   * Les rôles sont filtrés par LISTE BLANCHE `('user','assistant')`. Une liste
   * noire excluant `internal_note` laisserait passer tout rôle ajouté plus tard
   * et fausserait le chiffre en silence.
   *
   * `null` quand aucune paire exploitable n'existe — l'interface affiche « — »,
   * jamais « 0 s ».
   */
  async getResponseTime({ tenantId, from, to }) {
    const [row] = await select(`
      WITH ordered AS (
        SELECT c.id AS conversation_id,
               m.ord,
               m.value->>'role' AS role,
               ${MESSAGE_SENT_AT} AS sent_at
          FROM "Conversation" c
          CROSS JOIN LATERAL jsonb_array_elements(c.messages) WITH ORDINALITY AS m(value, ord)
         WHERE ${IN_WINDOW}
           AND m.value->>'role' IN ('user', 'assistant')
      ),
      paired AS (
        SELECT role,
               sent_at,
               LEAD(role) OVER w AS reply_role,
               LEAD(sent_at) OVER w AS reply_at
          FROM ordered
        WINDOW w AS (PARTITION BY conversation_id ORDER BY ord)
      )
      SELECT percentile_cont(0.5) WITHIN GROUP (
               ORDER BY EXTRACT(EPOCH FROM (reply_at - sent_at))
             ) AS median_seconds
        FROM paired
       WHERE role = 'user' AND reply_role = 'assistant'
         AND sent_at IS NOT NULL AND reply_at IS NOT NULL
         AND reply_at >= sent_at
    `, { tenantId, from, to });

    const median = row?.median_seconds;
    if (median === null || median === undefined) return null;

    const seconds = Number.parseFloat(median);
    return Number.isFinite(seconds) ? Math.round(seconds) : null;
  }

  /** Satisfaction sur la période, avec la formule partagée. */
  async getSatisfaction({ tenantId, from, to }) {
    const rows = await select(`
      SELECT ${satisfaction.SENTIMENT_EXPRESSION} AS sentiment, COUNT(*) AS count
        FROM "Conversation" c
       WHERE ${IN_WINDOW}
         AND ${satisfaction.SENTIMENT_FILTER}
       GROUP BY 1
    `, { tenantId, from, to });

    const [ratingRow] = await select(`
      SELECT AVG(c.satisfaction_rating) AS avg_rating
        FROM "Conversation" c
       WHERE ${IN_WINDOW}
         AND c.satisfaction_rating IS NOT NULL
    `, { tenantId, from, to });

    return {
      ...satisfaction.summarize(rows),
      averageRating: satisfaction.averageRating(ratingRow?.avg_rating),
    };
  }

  /**
   * Taille de la base de connaissances.
   *
   * Seul chiffre NON borné par la fenêtre, et c'est volontaire : c'est un état
   * courant, pas un flux. « 12 documents actifs » ne dépend pas de la période
   * qu'on regarde.
   */
  async getKnowledgeBaseSize(tenantId) {
    return KnowledgeBase.count({ where: { tenantId, isActive: true } });
  }

  /** Tout le tableau de bord, en une passe. */
  async getDashboard({ tenantId, from, to }) {
    const window = { tenantId, from, to };

    const [totals, uniqueVisitors, avgResponseTime, sentiment, knowledgeBaseSize] =
      await Promise.all([
        this.getConversationTotals(window),
        this.getUniqueVisitors(window),
        this.getResponseTime(window),
        this.getSatisfaction(window),
        this.getKnowledgeBaseSize(tenantId),
      ]);

    return {
      totalConversations: totals.conversations,
      totalMessages: totals.messages,
      uniqueVisitors,
      avgResponseTime,
      knowledgeBaseSize,
      averageRating: sentiment.averageRating,
      satisfactionRate: sentiment.rate,
      satisfactionSampleSize: sentiment.sampleSize,
      sentimentDistribution: sentiment.distribution,
    };
  }
}

module.exports = new TenantStatsService();

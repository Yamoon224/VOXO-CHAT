/**
 * Taux de satisfaction dérivé de l'analyse de sentiment.
 *
 * Formule UNIQUE, partagée par le tableau de bord d'un tenant et les
 * statistiques globales de la plateforme : deux implémentations donneraient
 * fatalement deux chiffres contradictoires pour la même donnée.
 *
 * Elle corrige deux défauts de la version précédente :
 *  - le dénominateur additionnait TOUS les libellés renvoyés par la base, y
 *    compris ceux que le numérateur ignorait (un `sentiment` nul ou une
 *    variante de casse dégonflait donc le taux en silence) ;
 *  - le filtre SQL testait `metadata->'feedbackSentiment' IS NOT NULL`, qui ne
 *    détecte pas un JSON `null` : la ligne passait puis comptait pour rien.
 *
 * Module pur : ni Sequelize, ni HTTP.
 */

const SENTIMENTS = ['positive', 'neutral', 'negative'];

/**
 * En deçà de ce nombre d'avis, aucun taux n'est publié : afficher « 100 % »
 * à partir d'une seule conversation serait trompeur.
 */
const MIN_SAMPLE_SIZE = 5;

/**
 * Fragment SQL commun à toutes les requêtes de sentiment.
 *
 * Filtrer sur la valeur extraite plutôt que sur la présence de la clé écarte
 * d'un coup le JSON `null`, l'objet sans clé `sentiment` et tout libellé
 * inattendu — ce que ni `IS NOT NULL` ni l'opérateur `?` ne font.
 */
const SENTIMENT_FILTER = `metadata->'feedbackSentiment'->>'sentiment' IN ('positive','neutral','negative')`;

const SENTIMENT_EXPRESSION = `metadata->'feedbackSentiment'->>'sentiment'`;

/**
 * Agrège les lignes `{ sentiment, count }` d'un GROUP BY.
 * Seuls les libellés connus alimentent le total : numérateur et dénominateur
 * portent ainsi toujours sur le même ensemble.
 */
function summarize(rows = []) {
  const distribution = { positive: 0, neutral: 0, negative: 0 };
  let sampleSize = 0;

  rows.forEach((row) => {
    const sentiment = row.sentiment;
    if (!SENTIMENTS.includes(sentiment)) return;

    const count = Number.parseInt(row.count, 10) || 0;
    distribution[sentiment] += count;
    sampleSize += count;
  });

  return {
    distribution,
    sampleSize,
    // `null` distingue « pas assez d'avis » de « 0 % de satisfaction ».
    rate: sampleSize >= MIN_SAMPLE_SIZE
      ? Math.round((distribution.positive / sampleSize) * 100)
      : null,
  };
}

/** Moyenne des notes explicites ; `null` quand aucune note n'existe. */
function averageRating(rawAverage) {
  if (rawAverage === null || rawAverage === undefined) return null;
  const value = Number.parseFloat(rawAverage);
  return Number.isFinite(value) ? Number(value.toFixed(1)) : null;
}

module.exports = {
  SENTIMENTS,
  MIN_SAMPLE_SIZE,
  SENTIMENT_FILTER,
  SENTIMENT_EXPRESSION,
  summarize,
  averageRating,
};

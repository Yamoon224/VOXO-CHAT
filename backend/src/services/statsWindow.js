/**
 * Fenêtre temporelle commune aux statistiques.
 *
 * Extraite de `platformStatsService` au moment où le tableau de bord d'un
 * tenant a cessé de compter depuis la création du compte : les deux zones
 * bornent désormais leurs chiffres de la même façon, et deux implémentations
 * divergeraient au premier ajustement.
 *
 * Module pur : ni Sequelize, ni HTTP.
 */

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * Fenêtre [from, to[ en UTC, alignée sur des journées entières.
 *
 * `to` est le début de DEMAIN : la journée en cours est donc incluse, ce qui
 * serait faux avec un simple `new Date()` comme borne haute.
 */
function buildWindow(period = '30d') {
  const days = PERIOD_DAYS[period] || PERIOD_DAYS['30d'];
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  to.setUTCDate(to.getUTCDate() + 1);

  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);

  return { from, to, days };
}

module.exports = { PERIOD_DAYS, buildWindow };

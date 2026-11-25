const { sequelize } = require('../models');
const planService = require('./planService');

/**
 * Revenu mensuel récurrent ESTIMÉ.
 *
 * Estimation, et rien d'autre : aucun paiement n'est encaissé ni vérifié par
 * la plateforme. Le chiffre est la somme des prix affichés des forfaits des
 * entreprises qui ont effectivement accès au service.
 *
 * Sont exclues :
 *  - les entreprises supprimées (`deleted_at`), sinon on facturerait des clients partis ;
 *  - les entreprises bloquées (`is_active = false`), qui n'ont plus accès au service.
 */
class PlatformRevenueService {
  /**
   * Répartition des entreprises actives par forfait.
   * Sept lignes au plus : un GROUP BY suffit, inutile de charger les tenants.
   */
  async countActiveTenantsByPlan() {
    return sequelize.query(`
      SELECT subscription_plan AS plan, COUNT(*) AS tenants
        FROM "Tenant"
       WHERE deleted_at IS NULL AND is_active = true
       GROUP BY subscription_plan
    `, { type: sequelize.QueryTypes.SELECT });
  }

  async getMonthlyRevenue() {
    const [rows, plans] = await Promise.all([
      this.countActiveTenantsByPlan(),
      planService.listPlans(),
    ]);

    const priceOf = name => plans.find(plan => plan.name === name);
    let amount = 0;

    const breakdown = rows.map((row) => {
      const plan = priceOf(row.plan);
      const tenants = Number.parseInt(row.tenants, 10) || 0;
      const unitPrice = plan?.priceAmount ?? 0;
      amount += unitPrice * tenants;

      return {
        plan: row.plan,
        label: plan?.label || row.plan,
        tenants,
        unitPrice,
        total: unitPrice * tenants,
      };
    });

    return {
      // En centimes, comme `plans.price_amount` : jamais un flottant pour de la monnaie.
      amount,
      currency: plans[0]?.priceCurrency || 'EUR',
      estimated: true,
      breakdown: breakdown.sort((a, b) => b.total - a.total),
    };
  }
}

module.exports = new PlatformRevenueService();

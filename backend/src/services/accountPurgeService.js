const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Tenant,
  TeamInvitation,
  KnowledgeBase,
  CrawlJob,
} = require('../models');
const tenantDeletionService = require('./tenantDeletionService');
const { computePurgeCutoff, RETENTION_DAYS } = require('./accountRetention');
const { logChannelEvent } = require('../utils/channelLogger');

/**
 * Purge définitive des comptes soft-deletés depuis plus de `RETENTION_DAYS`.
 *
 * Appelé par `scripts/purgeDeletedAccounts.js` (cron externe). Idempotent :
 * un second passage immédiat ne trouve plus rien à supprimer.
 */
class AccountPurgeService {
  /** Lignes soft-deletées, invisibles des requêtes normales : `paranoid: false` obligatoire. */
  findExpired(model, cutoff) {
    return model.findAll({
      paranoid: false,
      where: { deletedAt: { [Op.lte]: cutoff } },
      order: [['deletedAt', 'ASC']],
    });
  }

  /**
   * Détache l'utilisateur des entités qu'il a créées avant de l'effacer : ces
   * clés étrangères survivent au compte (contenu de l'entreprise) et
   * bloqueraient sinon la suppression physique.
   */
  async purgeUser(user) {
    await sequelize.transaction(async (transaction) => {
      // `invited_by` est NOT NULL + ON DELETE RESTRICT : on ne peut pas le détacher.
      await TeamInvitation.destroy({
        where: { invitedBy: user.id },
        force: true,
        transaction,
      });
      await KnowledgeBase.update(
        { createdBy: null },
        { where: { createdBy: user.id }, transaction }
      );
      await CrawlJob.update(
        { createdBy: null },
        { where: { createdBy: user.id }, transaction }
      );
      await user.destroy({ force: true, transaction });
    });
  }

  async purgeTenants(cutoff, report) {
    const tenants = await this.findExpired(Tenant, cutoff);
    for (const tenant of tenants) {
      try {
        // Les webhooks externes ont déjà été coupés au moment du soft delete.
        await tenantDeletionService.deleteTenantData(tenant, { force: true });
        report.tenantsPurged += 1;
      } catch (error) {
        report.errors.push({ type: 'tenant', id: tenant.id, message: error.message });
        logChannelEvent('error', 'account.purge_tenant_failed', {
          tenantId: tenant.id,
          error: error.message,
        });
      }
    }
  }

  async purgeUsers(cutoff, report) {
    // Après `purgeTenants`, les membres des entreprises purgées n'existent plus :
    // il ne reste ici que les comptes supprimés individuellement.
    const users = await this.findExpired(User, cutoff);
    for (const user of users) {
      try {
        await this.purgeUser(user);
        report.usersPurged += 1;
      } catch (error) {
        report.errors.push({ type: 'user', id: user.id, message: error.message });
        logChannelEvent('error', 'account.purge_user_failed', {
          userId: user.id,
          tenantId: user.tenantId,
          error: error.message,
        });
      }
    }
  }

  async purgeExpired(now = new Date()) {
    const cutoff = computePurgeCutoff(now);
    const report = { cutoff, retentionDays: RETENTION_DAYS, tenantsPurged: 0, usersPurged: 0, errors: [] };

    await this.purgeTenants(cutoff, report);
    await this.purgeUsers(cutoff, report);

    logChannelEvent('info', 'account.purge_completed', {
      cutoff: cutoff.toISOString(),
      tenantsPurged: report.tenantsPurged,
      usersPurged: report.usersPurged,
      errors: report.errors.length,
    });
    return report;
  }
}

module.exports = new AccountPurgeService();
module.exports.AccountPurgeService = AccountPurgeService;

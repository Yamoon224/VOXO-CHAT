const {
  sequelize,
  User,
  KnowledgeBase,
  KnowledgeChunk,
  Conversation,
  TenantUsage,
  CrawlJob,
  TeamInvitation,
  MessageAttachment,
} = require('../models');
const storageService = require('./storageService');
const telegramService = require('./telegramService');
const { logChannelEvent } = require('../utils/channelLogger');

const EXTERNAL_CLEANUP_TIMEOUT_MS = 10000;

class TenantDeletionService {
  withTimeout(promise, label) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`${label} timed out`)),
        EXTERNAL_CLEANUP_TIMEOUT_MS
      );
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
  }

  async disconnectTelegram(tenantId, settings = {}) {
    if (!settings.botToken || !settings.webhookActive) return;

    await this.withTimeout(
      telegramService.deleteWebhook(settings.botToken),
      'Telegram webhook cleanup'
    );
    logChannelEvent('info', 'tenant.deletion_channel_disconnected', {
      tenantId,
      channel: 'telegram',
    });
  }

  async disconnectWhatsApp(tenantId, settings = {}) {
    if (!settings.phoneNumberId || !settings.webhookActive) return;
    logChannelEvent('info', 'tenant.deletion_channel_disconnected', {
      tenantId,
      channel: 'whatsapp',
      phoneNumberId: settings.phoneNumberId,
    });
  }

  async cleanupExternalChannels(tenant) {
    const channels = tenant.settings?.channels || {};
    const cleanups = [
      ['telegram', this.disconnectTelegram(tenant.id, channels.telegram)],
      ['whatsapp', this.disconnectWhatsApp(tenant.id, channels.whatsapp)],
    ];
    const results = await Promise.allSettled(cleanups.map(([, cleanup]) => cleanup));

    results.forEach((result, index) => {
      if (result.status !== 'rejected') return;
      logChannelEvent('error', 'tenant.deletion_channel_disconnect_failed', {
        tenantId: tenant.id,
        channel: cleanups[index][0],
        error: result.reason,
      });
    });
  }

  /**
   * Suppression physique des données d'un tenant.
   * `force` est indispensable depuis que `User` et `Tenant` sont `paranoid` :
   * sans lui, la purge « définitive » se contenterait de reposer un `deleted_at`.
   */
  async deleteTenantData(tenant, { force = true } = {}) {
    await sequelize.transaction(async (transaction) => {
      const where = { tenantId: tenant.id };
      await KnowledgeChunk.destroy({ where, transaction });
      await KnowledgeBase.destroy({ where, transaction });
      await CrawlJob.destroy({ where, transaction });
      await MessageAttachment.destroy({ where, transaction });
      await Conversation.destroy({ where, transaction });
      await TenantUsage.destroy({ where, transaction });
      // `team_invitations.invited_by` est en ON DELETE RESTRICT : les invitations
      // doivent partir avant leurs auteurs, sinon la suppression des users échoue.
      await TeamInvitation.destroy({ where, force: true, transaction });
      await User.destroy({ where, force, transaction });
      await tenant.destroy({ force, transaction });
    });

    // Hors transaction : le stockage objet n'est pas transactionnel, et un
    // échec ici ne doit pas annuler la suppression en base. Au pire il reste
    // des fichiers orphelins, signalés dans les logs.
    await this.deleteTenantFiles(tenant.id);
  }

  async deleteTenantFiles(tenantId) {
    if (!storageService.isConfigured()) return;

    try {
      const removed = await storageService.removeTenantPrefix(tenantId);
      logChannelEvent('info', 'tenant.deletion_files_removed', { tenantId, removed });
    } catch (error) {
      logChannelEvent('error', 'tenant.deletion_files_failed', {
        tenantId,
        error: error.message,
      });
    }
  }

  async deleteTenant(tenant) {
    await this.cleanupExternalChannels(tenant);
    await this.deleteTenantData(tenant);
  }
}

module.exports = new TenantDeletionService();
module.exports.TenantDeletionService = TenantDeletionService;
module.exports.EXTERNAL_CLEANUP_TIMEOUT_MS = EXTERNAL_CLEANUP_TIMEOUT_MS;

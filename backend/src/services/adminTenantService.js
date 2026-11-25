const { Op } = require('sequelize');
const { Tenant, User } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { sanitizeChannelStatus } = require('./channelSettingsService');
const accountDeletionService = require('./accountDeletionService');
const quotaService = require('./quotaService');

/**
 * Consultation des entreprises clientes par un administrateur de la
 * plateforme. Lecture seule : les actions vivent dans adminTenantStatusService.
 *
 * Volontairement transverse aux tenants — c'est tout l'objet du module — donc
 * aucune de ces requêtes ne porte de filtre `tenantId`. L'accès est gardé en
 * amont par `authenticateAdmin` + `requireAdminPermission('tenants', …)`.
 */
class AdminTenantService {
  toPublicTenant(tenant) {
    return {
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
      subscriptionPlan: tenant.subscriptionPlan,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
    };
  }

  async listTenants({ page = 1, limit = 20, search, subscriptionPlan, status }) {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);

    const where = {};
    if (subscriptionPlan) where.subscriptionPlan = subscriptionPlan;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where[Op.or] = ['name', 'subdomain', 'domain'].map(field => ({
        [field]: { [Op.iLike]: `%${search.trim()}%` },
      }));
    }

    // `paranoid` exclut d'office les entreprises supprimées : une suppression
    // est le fait du client, elle ne regarde pas l'administration.
    const { count, rows } = await Tenant.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    });

    return {
      tenants: rows.map(tenant => this.toPublicTenant(tenant)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
        pages: Math.ceil(count / safeLimit),
      },
    };
  }

  async findTenantOrFail(tenantId) {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError('Entreprise introuvable', 404, { code: 'TENANT_NOT_FOUND' });
    }
    return tenant;
  }

  /** Propriétaire de l'entreprise : aucune association ne l'expose directement. */
  async findOwner(tenantId) {
    const owner = await User.findOne({
      where: { tenantId, role: 'owner' },
      // `preferredLocale` sert aux notifications de suspension/réactivation,
      // envoyées au propriétaire dans sa langue (adminTenantStatusService).
      attributes: ['id', 'firstName', 'lastName', 'email', 'isActive', 'lastLoginAt', 'preferredLocale'],
      order: [['createdAt', 'ASC']],
    });
    return owner ? owner.get({ plain: true }) : null;
  }

  /**
   * Fiche complète. Tout est agrégé depuis des services existants plutôt que
   * réécrit : la volumétrie vient du calcul déjà utilisé avant une suppression,
   * la consommation du service de quotas, et l'état des canaux passe par
   * `sanitizeChannelStatus` — jamais les tokens bruts.
   */
  async getTenantDetail(tenantId) {
    const tenant = await this.findTenantOrFail(tenantId);

    const [owner, impact, quotas] = await Promise.all([
      this.findOwner(tenant.id),
      accountDeletionService.countCompanyImpact(tenant.id),
      quotaService.getQuotaStatus(tenant),
    ]);

    return {
      ...this.toPublicTenant(tenant),
      owner,
      usage: impact,
      quotas,
      channels: sanitizeChannelStatus(tenant.settings?.channels),
      features: tenant.settings?.features || {},
    };
  }
}

module.exports = new AdminTenantService();

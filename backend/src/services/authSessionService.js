const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');
const { computeTenantFeatures } = require('./tenantFeatureFlags');
const storage = require('./storageService');

class AuthSessionService {
  /**
   * Interdit toute session tant que l'adresse n'est pas confirmée.
   * Appelé au login, au refresh et dans le middleware d'authentification —
   * ce dernier neutralise aussi les jetons émis avant la mise en place.
   */
  assertEmailVerified(user) {
    if (user.emailVerifiedAt) return;
    throw new AppError('Veuillez confirmer votre adresse email pour continuer', 403, {
      code: 'EMAIL_NOT_VERIFIED',
      details: { email: user.email },
    });
  }

  generateAccessToken(userId, tenantId) {
    return jwt.sign(
      { id: userId, tenantId, iat: Math.floor(Date.now() / 1000) },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  generateRefreshToken(userId, tenantId) {
    return jwt.sign(
      { id: userId, tenantId, type: 'refresh', iat: Math.floor(Date.now() / 1000) },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  buildTokens(userId, tenantId) {
    const payload = {
      accessToken: this.generateAccessToken(userId, tenantId),
      refreshToken: this.generateRefreshToken(userId, tenantId),
      expiresIn: config.jwt.expiresIn,
    };
    return payload;
  }

  /**
   * Vue publique d'un tenant, partagée par register / login / profile.
   *
   * Les caractéristiques sont recalculées ici depuis le forfait plutôt que lues
   * dans `settings` : c'est ce qui garantit qu'une édition de forfait s'applique
   * immédiatement à tous les clients concernés.
   */
  async buildTenantPayload(tenant) {
    const payload = {
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
      subscriptionPlan: tenant.subscriptionPlan,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt,
      settings: tenant.settings,
      features: await computeTenantFeatures(tenant),
    };
    const key = tenant.settings?.branding?.logoStorageKey;
    if (key) payload.logoUrl = await storage.createSignedUrl(key, tenant.id);
    return payload;
  }

  /** Payload complet de session : utilisateur, tenant et jetons. */
  async buildSession(user, tenant) {
    return {
      user: await (async () => {
        const data = user.toJSON();
        if (data.avatarStorageKey) data.avatarUrl = await storage.createSignedUrl(data.avatarStorageKey, data.tenantId);
        return data;
      })(),
      tenant: await this.buildTenantPayload(tenant),
      tokens: this.buildTokens(user.id, tenant.id),
    };
  }
}

module.exports = new AuthSessionService();

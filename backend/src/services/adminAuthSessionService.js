const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Jetons de la plateforme d'administration.
 *
 * Même secret que les sessions tenant, mais la claim `scope: 'admin'` sépare
 * strictement les deux mondes (voir middleware/adminAuthMiddleware.js).
 */
class AdminAuthSessionService {
  generateAccessToken(adminId) {
    return jwt.sign(
      { id: adminId, scope: 'admin', iat: Math.floor(Date.now() / 1000) },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  generateRefreshToken(adminId) {
    return jwt.sign(
      { id: adminId, scope: 'admin', type: 'refresh', iat: Math.floor(Date.now() / 1000) },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
  }

  buildTokens(adminId) {
    return {
      accessToken: this.generateAccessToken(adminId),
      refreshToken: this.generateRefreshToken(adminId),
      expiresIn: config.jwt.expiresIn,
    };
  }

  verifyRefreshToken(token) {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.scope !== 'admin' || decoded.type !== 'refresh') return null;
    return decoded;
  }

  /** Payload complet de session : compte administrateur et jetons. */
  buildSession(admin) {
    return {
      admin: admin.toJSON(),
      tokens: this.buildTokens(admin.id),
    };
  }
}

module.exports = new AdminAuthSessionService();

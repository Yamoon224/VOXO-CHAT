const crypto = require('crypto');
const { Op } = require('sequelize');
const { AuthToken, sequelize } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');

const TOKEN_TYPES = {
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
};

const TTL_MS = {
  [TOKEN_TYPES.PASSWORD_RESET]: 60 * 60 * 1000, // 1 heure
  [TOKEN_TYPES.EMAIL_VERIFICATION]: 24 * 60 * 60 * 1000, // 24 heures
};

class AuthTokenService {
  constructor() {
    this.TOKEN_TYPES = TOKEN_TYPES;
  }

  createToken() {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, tokenHash: this.hashToken(token) };
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
  }

  getTtlMs(type) {
    return TTL_MS[type];
  }

  /**
   * Émet un jeton à usage unique et invalide les précédents du même type.
   * Seul le hash est persisté ; le jeton brut n'est retourné qu'à l'appelant.
   */
  async issue(userId, type, ttlMs = TTL_MS[type]) {
    if (!ttlMs) {
      throw new AppError('Type de jeton inconnu', 500, { code: 'AUTH_TOKEN_TYPE_UNKNOWN' });
    }

    await this.invalidateActive(userId, type);

    const { token, tokenHash } = this.createToken();
    await AuthToken.create({
      userId,
      type,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlMs),
    });

    return { token, expiresInMs: ttlMs };
  }

  async invalidateActive(userId, type) {
    await AuthToken.update(
      { consumedAt: new Date() },
      { where: { userId, type, consumedAt: { [Op.is]: null } } }
    );
  }

  /**
   * Consomme un jeton de façon atomique et retourne son userId.
   * Lève 400 TOKEN_INVALID ou 410 TOKEN_EXPIRED.
   */
  async consume(token, type) {
    const transaction = await sequelize.transaction();
    try {
      const authToken = await AuthToken.findOne({
        where: { tokenHash: this.hashToken(token), type },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      this.assertConsumable(authToken);
      await authToken.update({ consumedAt: new Date() }, { transaction });
      await transaction.commit();
      return { userId: authToken.userId };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  assertConsumable(authToken) {
    if (!authToken || authToken.consumedAt) {
      throw new AppError('Ce lien est invalide ou a déjà été utilisé', 400, {
        code: 'TOKEN_INVALID',
      });
    }
    if (authToken.expiresAt <= new Date()) {
      throw new AppError('Ce lien a expiré', 410, { code: 'TOKEN_EXPIRED' });
    }
  }
}

module.exports = new AuthTokenService();

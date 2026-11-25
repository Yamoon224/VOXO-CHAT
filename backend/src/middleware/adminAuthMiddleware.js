const jwt = require('jsonwebtoken');
const { AdminUser, AdminRole } = require('../models');
const { AppError } = require('./errorMiddleware');
const config = require('../config/config');

/**
 * Authentifie un compte de la plateforme d'administration.
 *
 * La claim `scope: 'admin'` est ce qui rend les deux mondes étanches : un jeton
 * de session tenant, même parfaitement valide et signé avec le même secret, ne
 * la porte pas et se voit refuser ici avant toute lecture en base. Inversement,
 * l'identifiant d'un jeton admin ne correspond à aucune ligne `User`, donc le
 * middleware tenant reste imperméable sans avoir été modifié.
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentification requise', 401, { code: 'AUTH_REQUIRED' }));
    }

    const decoded = jwt.verify(authHeader.substring(7), config.jwt.secret);

    if (decoded.scope !== 'admin' || decoded.type === 'refresh') {
      return next(new AppError('Jeton invalide', 401, { code: 'ADMIN_TOKEN_INVALID' }));
    }

    // Le rôle est chargé à chaque requête : une permission retirée s'applique
    // immédiatement, sans révocation de jeton à gérer.
    const admin = await AdminUser.findOne({
      where: { id: decoded.id, isActive: true },
      include: [{ model: AdminRole, as: 'role' }],
    });

    if (!admin) {
      return next(new AppError('Compte administrateur introuvable ou bloqué', 401, {
        code: 'ADMIN_NOT_FOUND',
      }));
    }

    req.adminUser = admin;
    admin.lastLoginAt = new Date();
    await admin.save();

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Jeton invalide', 401, { code: 'ADMIN_TOKEN_INVALID' }));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Session expirée', 401, { code: 'TOKEN_EXPIRED' }));
    }
    next(error);
  }
};

module.exports = { authenticateAdmin };

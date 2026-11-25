const { AdminUser, AdminRole } = require('../models');
const { successResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');
const sessionService = require('../services/adminAuthSessionService');

const findActiveAdmin = where => AdminUser.findOne({
  where: { ...where, isActive: true },
  include: [{ model: AdminRole, as: 'role' }],
});

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await findActiveAdmin({ email: email.trim().toLowerCase() });

    // Même message que le mot de passe erroné : ne pas révéler quels emails
    // correspondent à un compte administrateur.
    if (!admin || !(await admin.comparePassword(password))) {
      return next(new AppError('Email ou mot de passe incorrect', 401, {
        code: 'ADMIN_INVALID_CREDENTIALS',
      }));
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    successResponse(res, sessionService.buildSession(admin), 'Connexion réussie', 200, 'LOGIN_SUCCESS');
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const decoded = sessionService.verifyRefreshToken(req.body.refreshToken);
    if (!decoded) {
      return next(new AppError('Jeton invalide', 401, { code: 'ADMIN_TOKEN_INVALID' }));
    }

    const admin = await findActiveAdmin({ id: decoded.id });
    if (!admin) {
      return next(new AppError('Compte administrateur introuvable ou bloqué', 401, {
        code: 'ADMIN_NOT_FOUND',
      }));
    }

    successResponse(res, sessionService.buildSession(admin), 'Session renouvelée', 200, 'ADMIN_TOKEN_REFRESHED');
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

const getProfile = async (req, res, next) => {
  try {
    successResponse(res, { admin: req.adminUser.toJSON() }, 'Profil récupéré avec succès', 200, 'PROFILE_RETRIEVED');
  } catch (error) {
    next(error);
  }
};

// Les jetons sont sans état côté serveur : la déconnexion se fait côté client.
const logout = async (req, res, next) => {
  try {
    successResponse(res, null, 'Déconnexion réussie', 200, 'LOGOUT_SUCCESS');
  } catch (error) {
    next(error);
  }
};

const updateLocale = async (req, res, next) => {
  try {
    await req.adminUser.update({ preferredLocale: req.body.preferredLocale });
    successResponse(res, { admin: req.adminUser.toJSON() }, 'Profil mis à jour avec succès', 200, 'PROFILE_UPDATED');
  } catch (error) {
    next(error);
  }
};

module.exports = { login, refreshToken, getProfile, logout, updateLocale };

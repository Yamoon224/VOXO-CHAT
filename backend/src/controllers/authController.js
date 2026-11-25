// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { Tenant, User } = require('../models');
const { successResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');
const config = require('../config/config');
const authSessionService = require('../services/authSessionService');
const tenantProvisioningService = require('../services/tenantProvisioningService');
const emailVerificationService = require('../services/emailVerificationService');
const storage = require('../services/storageService');

async function serializeUser(user) {
  const data = user.toJSON();
  if (data.avatarStorageKey) data.avatarUrl = await storage.createSignedUrl(data.avatarStorageKey, data.tenantId);
  return data;
}

// Inscription d'une nouvelle entreprise + premier utilisateur
const register = async (req, res, next) => {
  try {
    const {
      // Données entreprise (le site web se renseigne plus tard, dans les réglages)
      companyName,
      subdomain,
      subscriptionPlan = 'free',
      
      // Données utilisateur
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      preferredLocale = req.locale,
    } = req.body;

    // Validation des mots de passe
    if (password !== confirmPassword) {
      return next(new AppError('Les mots de passe ne correspondent pas', 400, { code: 'PASSWORDS_MISMATCH' }));
    }

    const { tenant, user } = await tenantProvisioningService.createTenantWithOwner({
      companyName,
      subdomain,
      subscriptionPlan,
      firstName,
      lastName,
      email,
      password,
      preferredLocale,
    });

    // Envoi best effort : une panne du fournisseur ne doit pas annuler
    // l'inscription, l'utilisateur pourra demander un renvoi.
    const verificationEmailSent = await emailVerificationService.sendVerification(user);

    // Aucun jeton de session tant que l'adresse n'est pas confirmée.
    const responseData = {
      user: await serializeUser(user),
      tenant: await authSessionService.buildTenantPayload(tenant),
      requiresEmailVerification: true,
      verificationEmailSent,
    };

    successResponse(
      res,
      responseData,
      'Compte créé. Confirmez votre adresse email pour activer votre accès.',
      201,
      'REGISTRATION_SUCCESS'
    );
  } catch (error) {
    next(error);
  }
};

// Connexion d'un utilisateur existant
const login = async (req, res, next) => {
  try {
    const { email, password, tenantId } = req.body;

    // Rechercher l'utilisateur avec son tenant
    const whereClause = { email, isActive: true };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const user = await User.findOne({
      where: whereClause,
      include: [{
        model: Tenant,
        as: 'tenant',
        where: { isActive: true },
      }],
    });

    // Le code n'est volontairement pas exposé au client : un email inconnu et
    // un mot de passe erroné doivent rester indistinguables (pas de fuite sur
    // l'existence d'un compte ni sur son état de vérification).
    if (!user) {
      return next(new AppError('Email ou mot de passe incorrect', 401, { code: 'INVALID_CREDENTIALS', hideCode: true }));
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError('Email ou mot de passe incorrect', 401, { code: 'INVALID_CREDENTIALS', hideCode: true }));
    }

    authSessionService.assertEmailVerified(user);

    // Mettre à jour la dernière connexion
    user.lastLoginAt = new Date();
    await user.save();

    successResponse(
      res,
      await authSessionService.buildSession(user, user.tenant),
      'Connexion réussie',
      200,
      'LOGIN_SUCCESS'
    );
  } catch (error) {
    next(error);
  }
};

// Rafraîchir le token d'accès
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return next(new AppError('Refresh token requis', 400, { code: 'REFRESH_TOKEN_REQUIRED' }));
    }

    // Vérifier le refresh token
    const decoded = jwt.verify(token, config.jwt.secret);

    if (decoded.type !== 'refresh') {
      return next(new AppError('Token invalide', 401, { code: 'TOKEN_INVALID' }));
    }

    // Vérifier que l'utilisateur existe toujours
    const user = await User.findOne({
      where: { 
        id: decoded.id, 
        tenantId: decoded.tenantId,
        isActive: true 
      },
      include: [{
        model: Tenant,
        as: 'tenant',
        where: { isActive: true },
      }],
    });

    if (!user) {
      return next(new AppError('Utilisateur non trouvé', 404, { code: 'USER_NOT_FOUND' }));
    }

    authSessionService.assertEmailVerified(user);

    const responseData = {
      tokens: authSessionService.buildTokens(user.id, user.tenantId),
    };

    successResponse(res, responseData, 'Token rafraîchi avec succès', 200, 'TOKEN_REFRESHED');
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Refresh token invalide ou expiré', 401, { code: 'REFRESH_TOKEN_INVALID' }));
    }
    next(error);
  }
};

// Obtenir le profil de l'utilisateur connecté
const getProfile = async (req, res, next) => {
  try {
    // L'utilisateur est déjà attaché par le middleware authenticate
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Tenant,
        as: 'tenant',
      }],
    });

    const responseData = {
      user: await serializeUser(user),
      tenant: await authSessionService.buildTenantPayload(user.tenant),
    };

    successResponse(res, responseData, 'Profil récupéré avec succès', 200, 'PROFILE_RETRIEVED');
  } catch (error) {
    next(error);
  }
};

// Mettre à jour le profil utilisateur
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email, preferredLocale } = req.body;
    const user = req.user;
    const emailChangePending = email !== user.email;

    await user.update({ firstName, lastName, ...(preferredLocale && { preferredLocale }) });

    // L'adresse actuelle reste celle de connexion : la nouvelle est mise en
    // attente et ne bascule qu'après confirmation du lien.
    if (emailChangePending) {
      await emailVerificationService.requestEmailChange(user, email);
    }

    const message = emailChangePending
      ? 'Profil mis à jour. Confirmez votre nouvelle adresse via le lien envoyé par email.'
      : 'Profil mis à jour avec succès';
    const code = emailChangePending ? 'PROFILE_UPDATE_EMAIL_PENDING' : 'PROFILE_UPDATED';

    successResponse(res, { ...(await serializeUser(user)), emailChangePending }, message, 200, code);
  } catch (error) {
    next(error);
  }
};

// Les flux de mot de passe (forgot / reset / change) vivent dans passwordController.js

// Déconnexion (côté client principalement)
const logout = async (req, res, next) => {
  try {
    // Dans une implémentation complète, on pourrait blacklister le token
    // Pour l'instant, on se contente d'une réponse de succès
    // Le client devra supprimer les tokens de son stockage local
    
    successResponse(res, null, 'Déconnexion réussie', 200, 'LOGOUT_SUCCESS');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  logout,
};

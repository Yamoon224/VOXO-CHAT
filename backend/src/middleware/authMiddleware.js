// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User, Tenant } = require('../models');
const { AppError } = require('./errorMiddleware');
const config = require('../config/config');
const authSessionService = require('../services/authSessionService');

// Middleware pour vérifier le token JWT
const authenticate = async (req, res, next) => {
  try {
    // Récupérer le token depuis l'header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Access token required', 401, { code: 'AUTH_REQUIRED' }));
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier le token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Récupérer l'utilisateur avec son tenant
    const user = await User.findOne({
      where: { 
        id: decoded.id,
        isActive: true 
      },
      include: [{
        model: Tenant,
        as: 'tenant',
        where: { isActive: true }
      }]
    });

    if (!user) {
      return next(new AppError('User not found or inactive', 401, { code: 'USER_NOT_FOUND' }));
    }

    // Vérifier que le tenant correspond
    if (req.tenant && user.tenantId !== req.tenant.id) {
      return next(new AppError('Access denied for this tenant', 403, { code: 'TENANT_ACCESS_DENIED' }));
    }

    // Neutralise aussi les jetons émis avant la mise en place de la vérification
    authSessionService.assertEmailVerified(user);

    // Ajouter l'utilisateur à la requête
    req.user = user;
    
    // Mettre à jour la dernière connexion
    user.lastLoginAt = new Date();
    await user.save();

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401, { code: 'TOKEN_INVALID' }));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, { code: 'TOKEN_EXPIRED' }));
    }
    next(error);
  }
};

// Le contrôle d'accès aux ressources est passé de `authorize(...roles)` à
// `requirePermission(resource, level)` : voir middleware/permissionMiddleware.js.

// Middleware optionnel (ne fait pas échouer si pas de token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret);
      
      const user = await User.findOne({
        where: { 
          id: decoded.id,
          isActive: true 
        },
        include: [{
          model: Tenant,
          as: 'tenant',
          where: { isActive: true }
        }]
      });

      if (user && (!req.tenant || user.tenantId === req.tenant.id)) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // En cas d'erreur, continuer sans utilisateur
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};
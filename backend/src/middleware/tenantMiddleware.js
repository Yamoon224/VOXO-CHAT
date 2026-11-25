// src/middleware/tenantMiddleware.js
const { Tenant } = require('../models');

const resolveTenantFromParam = ({ acknowledgeMissing = false } = {}) => async (req, res, next) => {
  try {
    const tenant = await Tenant.findOne({
      where: {
        id: req.params.tenantId,
        isActive: true,
      },
    });

    if (!tenant) {
      if (acknowledgeMissing) {
        return res.status(200).send('Tenant not found');
      }
      return res.status(404).json({
        success: false,
        error: 'Tenant not found or inactive',
        code: 'TENANT_NOT_FOUND',
      });
    }

    req.tenant = tenant;
    return next();
  } catch (error) {
    console.error('Error resolving tenant from route parameter:', {
      message: error.message,
      tenantId: req.params.tenantId,
      url: req.originalUrl,
      method: req.method,
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

const extractTenantFromRequest = async (req, res, next) => {
  try {
    let tenant = null;
    let tenantId = null;
    
    // Méthode 1: Via header X-Tenant-ID (priorité haute)
    if (req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
      tenant = await Tenant.findOne({ 
        where: { id: tenantId, isActive: true } 
      });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'Tenant non trouvé ou inactif',
          code: 'TENANT_NOT_FOUND',
        });
      }
    }
    
    // Méthode 2: Via sous-domaine (ex: client1.monapp.com)
    if (!tenant) {
      const hostHeader = req.get('host');
      if (hostHeader) {
        const subdomain = hostHeader.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost') {
          tenant = await Tenant.findOne({ 
            where: { subdomain, isActive: true } 
          });
        }
      }
    }
    
    // Méthode 3: Via paramètre de requête (pour développement uniquement)
    if (!tenant && req.query.tenantId && process.env.NODE_ENV !== 'production') {
      tenantId = req.query.tenantId;
      tenant = await Tenant.findOne({ 
        where: { id: tenantId, isActive: true } 
      });
    }
    
    // Méthode 4: Extraire du token JWT si disponible
    if (!tenant && req.user?.tenantId) {
      tenantId = req.user.tenantId;
      tenant = await Tenant.findOne({ 
        where: { id: tenantId, isActive: true } 
      });
    }
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found or inactive',
        code: 'TENANT_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    // Ajouter le tenant à la requête
    req.tenant = tenant;
    
    // Log pour le monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`🏢 Tenant actif: ${tenant.name} (${tenant.id})`);
    }
    
    next();
  } catch (error) {
    console.error('Error in tenant middleware:', {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      url: req.originalUrl,
      method: req.method,
      headers: {
        host: req.get('host'),
        'x-tenant-id': req.headers['x-tenant-id'],
        'user-agent': req.get('User-Agent')
      },
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware pour valider l'accès tenant (utilisé après l'authentification)
const validateTenantAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const tenant = req.tenant;
    
    if (!user || !tenant) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Vérifier que l'utilisateur appartient au tenant
    if (user.tenantId !== tenant.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied for this tenant',
        code: 'TENANT_ACCESS_DENIED'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in tenant access validation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Middleware pour les routes publiques (widget)
const optionalTenantFromRequest = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      req.tenant = null;
      return next();
    }

    // Utiliser le Tenant déjà importé en haut du fichier (éviter require circulaire)
    const tenant = await Tenant.findOne({
      where: {
        id: tenantId,
        isActive: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant non trouvé ou inactif',
        code: 'TENANT_NOT_FOUND'
      });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Erreur dans optionalTenantFromRequest:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la vérification du tenant',
      code: 'TENANT_ERROR'
    });
  }
};

module.exports = { 
  extractTenantFromRequest, 
  validateTenantAccess,
  optionalTenantFromRequest,
  resolveTenantFromParam,
};

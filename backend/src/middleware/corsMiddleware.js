// backend/src/middleware/corsMiddleware.js - Middleware CORS spécialisé
const config = require('../config/config');

const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  
  // Headers CORS de base
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept', 
    'Authorization',
    'X-Tenant-ID',
    'Cache-Control',
    'Pragma'
  ].join(', '));
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24h

  // Gestion des origines
  if (!origin) {
    // Pas d'origin (mobile apps, Postman, etc.)
    res.header('Access-Control-Allow-Origin', '*');
  } else if (config.env === 'development') {
    // En développement, permettre localhost sur tous les ports
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
  } else {
    // En production, vérifier les domaines autorisés
    const allowedOrigins = config.cors?.allowedOrigins || ['*'];
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      // Pour le widget, être plus permissif (à ajuster selon vos besoins de sécurité)
      res.header('Access-Control-Allow-Origin', '*');
    }
  }

  // Gérer les requêtes preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

module.exports = corsMiddleware;
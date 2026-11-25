const crypto = require('crypto');

const SWAGGER_REALM = 'VOXO API Documentation';

const secureCompare = (actual, expected) => {
  const actualDigest = crypto.createHash('sha256').update(actual).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();

  return crypto.timingSafeEqual(actualDigest, expectedDigest);
};

const parseBasicCredentials = authorization => {
  const match = /^Basic\s+(.+)$/i.exec(authorization || '');

  if (!match) {
    return null;
  }

  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch (_error) {
    return null;
  }
};

const createSwaggerBasicAuth = ({ environment, username, password }) => {
  const credentialsConfigured = Boolean(username && password);
  const localAccessWithoutCredentials = environment !== 'production' && !username && !password;

  return (req, res, next) => {
    if (localAccessWithoutCredentials) {
      return next();
    }

    if (!credentialsConfigured) {
      return res.status(503).json({
        success: false,
        error: 'Documentation unavailable',
      });
    }

    const credentials = parseBasicCredentials(req.get('authorization'));
    let authenticated = false;

    if (credentials) {
      const usernameMatches = secureCompare(credentials.username, username);
      const passwordMatches = secureCompare(credentials.password, password);
      authenticated = usernameMatches && passwordMatches;
    }

    if (!authenticated) {
      res.set('WWW-Authenticate', `Basic realm="${SWAGGER_REALM}", charset="UTF-8"`);
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    return next();
  };
};

const normalizeForwardedPrefix = value => {
  const prefix = value?.split(',')[0].trim() || '';

  if (!prefix || prefix === '/') {
    return '';
  }

  if (!/^\/(?!\/)[a-zA-Z0-9._~!$&'()*+,;=:@%/-]+$/.test(prefix)) {
    return '';
  }

  return prefix.replace(/\/+$/, '');
};

const getBackendUrlPrefix = backendUrl => {
  try {
    return normalizeForwardedPrefix(new URL(backendUrl).pathname);
  } catch (_error) {
    return '';
  }
};

const createSwaggerRedirect = ({ backendUrl }) => {
  const configuredPrefix = getBackendUrlPrefix(backendUrl);

  return (req, res) => {
    const forwardedPrefix = normalizeForwardedPrefix(req.get('x-forwarded-prefix'));
    const publicPrefix = forwardedPrefix || configuredPrefix;

    return res.redirect(308, `${publicPrefix}/api-docs/`);
  };
};

module.exports = {
  createSwaggerBasicAuth,
  createSwaggerRedirect,
  getBackendUrlPrefix,
  normalizeForwardedPrefix,
};

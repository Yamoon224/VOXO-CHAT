const config = require('../../config/config');
const brevoTransport = require('./brevoTransport');
const smtpTransport = require('./smtpTransport');

const TRANSPORTS = {
  brevo: brevoTransport,
  smtp: smtpTransport,
};

/**
 * Retourne le transport actif selon config.email.provider.
 * Un provider inconnu retombe sur Brevo, qui lèvera lui-même une
 * EMAIL_SERVICE_UNAVAILABLE si sa configuration est incomplète.
 */
function getTransport() {
  return TRANSPORTS[config.email.provider] || brevoTransport;
}

module.exports = { getTransport, TRANSPORTS };

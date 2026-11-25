const axios = require('axios');
const config = require('../config/config');
const cryptoUtils = require('../utils/cryptoUtils');
const ssrfGuard = require('../utils/ssrfGuard');

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function substitutePathParams(endpointUrl, args) {
  return endpointUrl.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key) => {
    if (!(key in args)) return match;
    const value = args[key];
    delete args[key];
    return encodeURIComponent(String(value));
  });
}

function renderHeaders(headersTemplate, secret) {
  const headers = {};
  for (const [key, value] of Object.entries(headersTemplate || {})) {
    headers[key] = secret ? String(value).replace('{{secret}}', secret) : value;
  }
  return headers;
}

function truncate(data) {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  if (!serialized || serialized.length <= config.agentAction.maxToolResultChars) return data;
  return `${serialized.slice(0, config.agentAction.maxToolResultChars)}... (truncated tool response)`;
}

async function execute(agentAction, rawArgs = {}) {
  const args = { ...rawArgs };
  const url = substitutePathParams(agentAction.endpointUrl, args);
  await ssrfGuard.assertPublicUrl(url);

  const secret = agentAction.authSecretEncrypted
    ? cryptoUtils.decrypt(agentAction.authSecretEncrypted)
    : null;
  const headers = renderHeaders(agentAction.headersTemplate, secret);
  const isBodyMethod = BODY_METHODS.has(agentAction.method);

  try {
    const response = await axios({
      method: agentAction.method,
      url,
      headers,
      params: isBodyMethod ? undefined : args,
      data: isBodyMethod ? args : undefined,
      timeout: agentAction.timeoutMs,
      validateStatus: () => true,
    });
    return { success: response.status < 400, status: response.status, data: truncate(response.data) };
  } catch (error) {
    return { success: false, error: error.code === 'ECONNABORTED' ? 'timeout' : 'network_error' };
  }
}

module.exports = { execute };

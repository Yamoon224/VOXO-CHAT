const axios = require('axios');
const { AppError } = require('../middleware/errorMiddleware');

const client = axios.create({ timeout: 15000, maxRedirects: 0 });
const text = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

async function wordpressItems(config, credentials) {
  const base = String(config.siteUrl || '').replace(/\/$/, '');
  if (!/^https:\/\//.test(base)) throw new AppError('L’URL WordPress doit utiliser HTTPS', 400, { code: 'INVALID_CONNECTOR_CONFIG' });
  const auth = credentials.token ? { Authorization: `Bearer ${credentials.token}` } : {};
  try {
    const items = [];
    for (let page = 1; page <= 20; page += 1) {
      const response = await client.get(`${base}/wp-json/voxo/v1/catalog?page=${page}`, { headers: auth });
      items.push(...(response.data.items || []));
      if (!response.data.hasMore) break;
    }
    return items.map(item => ({ externalId: item.id, title: item.title, content: text(item.content), sourceUrl: item.url, updatedAt: item.updatedAt, itemType: item.type || 'knowledge', sku: item.sku, priceAmount: item.priceAmount || null }));
  } catch (error) { throw new AppError('Impossible de synchroniser le site WordPress', 502, { code: 'WORDPRESS_UNAVAILABLE' }); }
}

async function microsoftItems(config, credentials) {
  if (!credentials.accessToken) throw new AppError('La connexion Microsoft 365 a expiré', 401, { code: 'MICROSOFT_AUTH_REQUIRED' });
  const drives = Array.isArray(config.drives) ? config.drives : [];
  const headers = { Authorization: `Bearer ${credentials.accessToken}` };
  try {
    const pages = await Promise.all(drives.map(drive => client.get(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(drive)}/root/children?$select=id,name,webUrl,lastModifiedDateTime,file`, { headers })));
    return pages.flatMap(page => page.data.value || []).filter(item => item.file).map(item => ({ externalId: `drive:${item.id}`, title: item.name, content: `Document Microsoft 365 : ${item.name}`, sourceUrl: item.webUrl, updatedAt: item.lastModifiedDateTime }));
  } catch (error) { throw new AppError('Impossible de lire Microsoft 365. Vérifiez les autorisations.', 502, { code: 'MICROSOFT_UNAVAILABLE' }); }
}

async function loadItems(connector, credentials) {
  return connector.provider === 'wordpress' ? wordpressItems(connector.config, credentials) : microsoftItems(connector.config, credentials);
}

module.exports = { loadItems };

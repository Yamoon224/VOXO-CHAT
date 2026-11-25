const service = require('./clientContextService');

function jsonResponse(payload) {
  return { ok: true, json: async () => payload };
}

function request(ip, headers = {}) {
  return { ip, headers, get: name => headers[name.toLowerCase()] || null };
}

describe('clientContextService', () => {
  beforeEach(() => {
    service.clearCache();
    delete process.env.IP_GEOLOCATION_ENABLED;
    global.fetch = jest.fn();
  });

  test('ignore les IP privées et de bouclage sans appel réseau', async () => {
    expect(await service.resolveLocation('::1')).toBeNull();
    expect(await service.resolveLocation('192.168.1.20')).toBeNull();
    expect(await service.resolveLocation('172.20.0.4')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('privilégie les en-têtes du proxy sur la résolution IP', async () => {
    const location = await service.resolveLocation('41.66.10.5', {
      'cf-ipcountry': 'ci',
      'x-geo-city': 'Abidjan',
    });
    expect(location).toEqual(expect.objectContaining({ countryCode: 'CI', city: 'Abidjan', source: 'header' }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('résout une IP publique puis sert le cache au second appel', async () => {
    global.fetch.mockResolvedValue(jsonResponse({
      status: 'success', country: 'Côte d’Ivoire', countryCode: 'CI',
      city: 'Abidjan', regionName: 'Abidjan', timezone: 'Africa/Abidjan',
    }));
    const first = await service.resolveLocation('41.66.10.5');
    const second = await service.resolveLocation('41.66.10.5');
    expect(first).toEqual({
      country: 'Côte d’Ivoire', countryCode: 'CI', city: 'Abidjan',
      region: 'Abidjan', timezone: 'Africa/Abidjan', source: 'ip',
    });
    expect(second).toEqual(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('renvoie null sans lever d’erreur quand la résolution échoue', async () => {
    global.fetch.mockRejectedValue(new Error('timeout'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await service.resolveLocation('41.66.10.5')).toBeNull();
    warn.mockRestore();
  });

  test('respecte la désactivation par variable d’environnement', async () => {
    process.env.IP_GEOLOCATION_ENABLED = 'false';
    expect(await service.resolveLocation('41.66.10.5')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('construit le contexte client complet à partir de la requête', async () => {
    global.fetch.mockResolvedValue(jsonResponse({ status: 'success', country: 'France', countryCode: 'FR', city: 'Paris' }));
    const context = await service.buildClientContext(request('90.10.0.1', {
      'user-agent': 'Mozilla/5.0', referer: 'https://neoburo.test/contact',
      origin: 'https://neoburo.test', 'accept-language': 'fr-FR,fr;q=0.9',
    }));
    expect(context).toEqual(expect.objectContaining({
      userAgent: 'Mozilla/5.0',
      ipAddress: '90.10.0.1',
      referrer: 'https://neoburo.test/contact',
      acceptLanguage: 'fr-FR,fr;q=0.9',
      location: expect.objectContaining({ city: 'Paris', countryCode: 'FR' }),
    }));
  });
});

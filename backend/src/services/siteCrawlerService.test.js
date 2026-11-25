jest.mock('axios');

const axios = require('axios');
const crawler = require('./siteCrawlerService');
const fileProcessingService = require('./fileProcessingService');

const { FETCH_FAILURES } = fileProcessingService;

// Fabrique une page HTML avec assez de texte pour passer le seuil d'extraction
const buildPage = (title, body = '') => `
<html><head><title>${title}</title></head>
<body><main><h1>${title}</h1>
<p>${'Contenu de documentation utile pour le support client. '.repeat(8)}</p>
${body}
</main></body></html>`;

const httpError = (status, headers = {}) => {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, headers };
  return error;
};

describe('parseRobots', () => {
  test('ne retient que les règles du groupe User-agent: *', () => {
    const robots = crawler.parseRobots([
      'User-agent: BadBot',
      'Disallow: /',
      '',
      'User-agent: *',
      'Disallow: /admin',
      'Crawl-delay: 2',
      'Sitemap: https://example.com/sitemap.xml',
    ].join('\n'));

    expect(robots.disallow).toEqual(['/admin']);
    expect(robots.crawlDelay).toBe(2);
    expect(robots.sitemaps).toEqual(['https://example.com/sitemap.xml']);
  });

  test('ignore les commentaires et les lignes vides', () => {
    const robots = crawler.parseRobots('# commentaire\n\nUser-agent: *\nDisallow: /prive');
    expect(robots.disallow).toEqual(['/prive']);
  });
});

describe('isAllowedByRobots', () => {
  test('bloque les préfixes déclarés', () => {
    expect(crawler.isAllowedByRobots('/admin/users', ['/admin'])).toBe(false);
    expect(crawler.isAllowedByRobots('/produits', ['/admin'])).toBe(true);
  });

  test('gère le joker et l\'ancre de fin', () => {
    expect(crawler.isAllowedByRobots('/a/secret/b', ['/a/*/b'])).toBe(false);
    expect(crawler.isAllowedByRobots('/page.php', ['/*.php$'])).toBe(false);
    expect(crawler.isAllowedByRobots('/page.html', ['/*.php$'])).toBe(true);
  });

  test('Disallow: / bloque tout le site', () => {
    expect(crawler.isAllowedByRobots('/quoi-que-ce-soit', ['/'])).toBe(false);
  });
});

describe('parseSitemap', () => {
  test('lit un urlset avec lastmod', () => {
    const { urls, nested } = crawler.parseSitemap(`<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/a</loc><lastmod>2026-01-05</lastmod></url>
        <url><loc>https://example.com/b</loc></url>
      </urlset>`);

    expect(urls).toEqual([
      { loc: 'https://example.com/a', lastmod: '2026-01-05' },
      { loc: 'https://example.com/b', lastmod: null },
    ]);
    expect(nested).toEqual([]);
  });

  test('lit un sitemapindex', () => {
    const { urls, nested } = crawler.parseSitemap(`<?xml version="1.0"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://example.com/s1.xml</loc></sitemap>
      </sitemapindex>`);

    expect(urls).toEqual([]);
    expect(nested).toEqual(['https://example.com/s1.xml']);
  });
});

describe('normalizeUrl', () => {
  test('retire le fragment et les paramètres de tracking, trie le reste', () => {
    expect(crawler.normalizeUrl('https://example.com/p?b=2&utm_source=x&a=1#ancre'))
      .toBe('https://example.com/p?a=1&b=2');
  });

  test('conserve le slash final, sémantiquement significatif', () => {
    expect(crawler.normalizeUrl('https://example.com/page/')).toBe('https://example.com/page/');
    expect(crawler.normalizeUrl('https://example.com/page')).toBe('https://example.com/page');
  });
});

describe('isInScope', () => {
  test('accepte le même domaine, www compris', () => {
    expect(crawler.isInScope('https://www.example.com/a', 'https://example.com', false)).toBe(true);
  });

  test('rejette un autre domaine et les sous-domaines par défaut', () => {
    expect(crawler.isInScope('https://autre.com/a', 'https://example.com', false)).toBe(false);
    expect(crawler.isInScope('https://blog.example.com/a', 'https://example.com', false)).toBe(false);
  });

  test('accepte les sous-domaines si demandé', () => {
    expect(crawler.isInScope('https://blog.example.com/a', 'https://example.com', true)).toBe(true);
  });

  test('rejette les fichiers binaires', () => {
    expect(crawler.isInScope('https://example.com/doc.pdf', 'https://example.com', false)).toBe(false);
  });
});

describe('extractLinks', () => {
  test('ne garde que les liens internes exploitables', () => {
    const html = `<a href="/interne">a</a>
      <a href="https://externe.com/x">b</a>
      <a href="mailto:x@y.z">c</a>
      <a href="#ancre">d</a>
      <a href="/doc.pdf">e</a>`;

    expect(crawler.extractLinks(html, 'https://example.com/', 'https://example.com', false))
      .toEqual(['https://example.com/interne']);
  });
});

describe('crawl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Router les réponses HTTP simulées par URL.
  // Une entrée peut être : une fonction (pour lever une erreur), une réponse
  // complète { status, data, ... }, ou une simple chaîne HTML.
  const mockRoutes = (routes) => {
    axios.get.mockImplementation(async (url) => {
      const handler = routes[url];
      if (!handler) throw httpError(404);
      if (typeof handler === 'function') return handler();
      if (typeof handler === 'object' && 'data' in handler) return handler;
      return {
        status: 200,
        data: handler,
        headers: { 'content-type': 'text/html' },
        request: { res: { responseUrl: url } },
      };
    });
  };

  test('découvre les pages via le sitemap déclaré dans robots.txt', async () => {
    mockRoutes({
      'https://example.com/robots.txt': {
        status: 200,
        data: 'User-agent: *\nSitemap: https://example.com/sitemap.xml',
        headers: { 'content-type': 'text/plain' },
        request: { res: { responseUrl: 'https://example.com/robots.txt' } },
      },
      'https://example.com/': buildPage('Accueil'),
      'https://example.com/sitemap.xml': {
        status: 200,
        data: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.com/a</loc></url>
          <url><loc>https://example.com/b</loc></url>
        </urlset>`,
        headers: { 'content-type': 'application/xml' },
        request: { res: { responseUrl: 'https://example.com/sitemap.xml' } },
      },
      'https://example.com/a': buildPage('Page A'),
      'https://example.com/b': buildPage('Page B'),
    });

    const result = await crawler.crawl('https://example.com', {
      maxPages: 10,
      politenessDelayMs: 0,
      concurrency: 1,
    });

    expect(result.strategy).toBe('sitemap');
    expect(result.discoveredVia).toBe('robots.txt');
    expect(result.pagesIndexed).toBe(2);
    expect(result.pagesFailed).toBe(0);
    expect(result.pages.map((page) => page.title).sort()).toEqual(['Page A', 'Page B']);
  });

  test('bascule sur le parcours des liens sans sitemap', async () => {
    mockRoutes({
      'https://example.com/robots.txt': () => { throw httpError(404); },
      'https://example.com/': buildPage('Accueil', '<a href="/contact">Contact</a>'),
      'https://example.com/contact': buildPage('Contact'),
    });

    const result = await crawler.crawl('https://example.com', {
      maxPages: 10,
      maxDepth: 2,
      politenessDelayMs: 0,
      concurrency: 1,
    });

    expect(result.strategy).toBe('links');
    expect(result.pagesIndexed).toBe(2);
    expect(result.pages.map((page) => page.title).sort()).toEqual(['Accueil', 'Contact']);
  });

  test('respecte maxPages', async () => {
    const routes = {
      'https://example.com/robots.txt': () => { throw httpError(404); },
      'https://example.com/': buildPage('Accueil'),
      'https://example.com/sitemap.xml': {
        status: 200,
        data: `<urlset>${Array.from({ length: 20 }, (_, i) => `<url><loc>https://example.com/p${i}</loc></url>`).join('')}</urlset>`,
        headers: { 'content-type': 'application/xml' },
        request: { res: { responseUrl: 'https://example.com/sitemap.xml' } },
      },
    };
    for (let i = 0; i < 20; i += 1) {
      routes[`https://example.com/p${i}`] = buildPage(`Page ${i}`);
    }
    mockRoutes(routes);

    const result = await crawler.crawl('https://example.com', {
      maxPages: 3,
      politenessDelayMs: 0,
      concurrency: 1,
    });

    expect(result.pagesIndexed).toBe(3);
  });

  test('déduplique les pages au contenu identique', async () => {
    const identical = buildPage('Même page');
    mockRoutes({
      'https://example.com/robots.txt': () => { throw httpError(404); },
      'https://example.com/': buildPage('Accueil', '<a href="/x">x</a><a href="/y">y</a>'),
      'https://example.com/x': identical,
      'https://example.com/y': identical,
    });

    const result = await crawler.crawl('https://example.com', {
      maxPages: 10,
      maxDepth: 2,
      politenessDelayMs: 0,
      concurrency: 1,
    });

    // Accueil + une seule des deux pages jumelles
    expect(result.pagesIndexed).toBe(2);
  });

  test('arrête le crawl après des blocages consécutifs', async () => {
    const routes = {
      'https://example.com/robots.txt': () => { throw httpError(404); },
      'https://example.com/': buildPage('Accueil'),
      'https://example.com/sitemap.xml': {
        status: 200,
        data: `<urlset>${Array.from({ length: 12 }, (_, i) => `<url><loc>https://example.com/p${i}</loc></url>`).join('')}</urlset>`,
        headers: { 'content-type': 'application/xml' },
        request: { res: { responseUrl: 'https://example.com/sitemap.xml' } },
      },
    };
    for (let i = 0; i < 12; i += 1) {
      routes[`https://example.com/p${i}`] = () => { throw httpError(403); };
    }
    mockRoutes(routes);

    const result = await crawler.crawl('https://example.com', {
      maxPages: 12,
      politenessDelayMs: 0,
      concurrency: 1,
      maxConsecutiveBlocks: 3,
    });

    expect(result.blocked).toBe(true);
    expect(result.pagesIndexed).toBe(0);
    // Le crawl s'interrompt bien avant d'avoir tenté les 12 pages
    expect(result.pagesFailed).toBeLessThan(12);
    expect(result.blockedMessage).toContain('anti-bot');
  });

  test('signale un échec racine quand la page de départ est bloquée', async () => {
    axios.get.mockImplementation(async () => { throw httpError(403); });

    const result = await crawler.crawl('https://example.com', {
      politenessDelayMs: 0,
      maxRetries: 0,
    });

    expect(result.pagesIndexed).toBe(0);
    expect(result.rootFailureReason).toBe(FETCH_FAILURES.BLOCKED);
  });

  test('refuse une URL interne (SSRF)', async () => {
    const result = await crawler.crawl('http://192.168.1.10/admin', { politenessDelayMs: 0 });

    expect(result.pagesIndexed).toBe(0);
    expect(result.rootFailureReason).toBe(FETCH_FAILURES.UNSAFE_URL);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('ignore les URLs interdites par robots.txt', async () => {
    mockRoutes({
      'https://example.com/robots.txt': {
        status: 200,
        data: 'User-agent: *\nDisallow: /prive\nSitemap: https://example.com/sitemap.xml',
        headers: { 'content-type': 'text/plain' },
        request: { res: { responseUrl: 'https://example.com/robots.txt' } },
      },
      'https://example.com/': buildPage('Accueil'),
      'https://example.com/sitemap.xml': {
        status: 200,
        data: `<urlset>
          <url><loc>https://example.com/public</loc></url>
          <url><loc>https://example.com/prive/secret</loc></url>
        </urlset>`,
        headers: { 'content-type': 'application/xml' },
        request: { res: { responseUrl: 'https://example.com/sitemap.xml' } },
      },
      'https://example.com/public': buildPage('Public'),
      'https://example.com/prive/secret': buildPage('Secret'),
    });

    const result = await crawler.crawl('https://example.com', {
      maxPages: 10,
      politenessDelayMs: 0,
      concurrency: 1,
    });

    expect(result.pages.map((page) => page.title)).toEqual(['Public']);
  });
});

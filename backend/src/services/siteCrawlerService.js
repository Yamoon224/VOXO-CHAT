// backend/src/services/siteCrawlerService.js - Découverte et parcours multi-pages d'un domaine
const zlib = require('zlib');
const crypto = require('crypto');
const cheerio = require('cheerio');
const fileProcessingService = require('./fileProcessingService');

const { FETCH_FAILURES } = fileProcessingService;

// Chemins de sitemap conventionnels, testés si robots.txt n'en déclare aucun
const CONVENTIONAL_SITEMAP_PATHS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-index.xml',
  '/wp-sitemap.xml',
  '/sitemap.xml.gz',
  '/page-sitemap.xml',
];

// Extensions à ne jamais suivre (fichiers binaires, médias)
const SKIPPED_EXTENSIONS = /\.(pdf|jpe?g|png|gif|webp|svg|ico|mp4|mp3|avi|mov|zip|rar|gz|tar|dmg|exe|css|js|json|xml|rss|woff2?|ttf|eot)$/i;

// Paramètres de tracking à retirer lors de la normalisation d'URL
const TRACKING_PARAMS = /^(utm_|fbclid|gclid|msclkid|mc_cid|mc_eid|ref|_ga)/i;

const DEFAULTS = {
  maxPages: 50,
  maxDepth: 3,
  concurrency: 3,
  politenessDelayMs: 500,
  includeSubdomains: false,
  maxSitemapIndexDepth: 3,
  maxConsecutiveBlocks: 5,
  pageTimeout: 15000,
};

class SiteCrawlerService {
  // ---------------------------------------------------------------- robots.txt

  // Récupérer et analyser le robots.txt d'une origine
  async fetchRobots(origin) {
    const empty = { sitemaps: [], disallow: [], crawlDelay: null, fetched: false };

    const result = await fileProcessingService.fetchUrl(`${origin}/robots.txt`, {
      timeout: 10000,
      maxRetries: 0,
      accept: 'text/plain,*/*;q=0.8',
    });

    if (!result.success) return empty;
    return { ...this.parseRobots(result.html), fetched: true };
  }

  // Analyser un robots.txt : directives du groupe applicable + sitemaps déclarés
  parseRobots(text) {
    const sitemaps = [];
    const disallow = [];
    let crawlDelay = null;

    // Un groupe s'applique si son User-agent vaut * (on ne se déclare pas sous un nom connu)
    let inApplicableGroup = false;
    let sawAnyGroup = false;

    for (const rawLine of String(text || '').split(/\r?\n/)) {
      const line = rawLine.replace(/#.*$/, '').trim();
      if (!line) continue;

      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) continue;

      const directive = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      if (!value) continue;

      // Sitemap est une directive globale, hors groupe
      if (directive === 'sitemap') {
        sitemaps.push(value);
        continue;
      }

      if (directive === 'user-agent') {
        // Un nouveau groupe démarre après des règles : on réévalue
        if (sawAnyGroup && !inApplicableGroup) {
          inApplicableGroup = value === '*';
        } else {
          inApplicableGroup = value === '*';
        }
        sawAnyGroup = true;
        continue;
      }

      if (!inApplicableGroup) continue;

      if (directive === 'disallow') {
        disallow.push(value);
      } else if (directive === 'crawl-delay') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) crawlDelay = parsed;
      }
    }

    return { sitemaps: [...new Set(sitemaps)], disallow, crawlDelay };
  }

  // Un chemin est-il autorisé par les règles Disallow ?
  isAllowedByRobots(pathname, disallow = []) {
    return !disallow.some((rule) => {
      if (rule === '/') return true;
      // Support basique des jokers `*` et de l'ancre de fin `$`
      if (rule.includes('*') || rule.endsWith('$')) {
        const pattern = rule
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\\\$$/, '$');
        try {
          return new RegExp(`^${pattern}`).test(pathname);
        } catch (_) {
          return false;
        }
      }
      return pathname.startsWith(rule);
    });
  }

  // ------------------------------------------------------------------ sitemaps

  // Cascade de découverte : robots.txt -> chemins conventionnels -> <link rel="sitemap">
  async discoverSitemaps(origin, robots, homepageHtml) {
    if (robots?.sitemaps?.length) {
      return { sitemaps: robots.sitemaps, discoveredVia: 'robots.txt' };
    }

    for (const path of CONVENTIONAL_SITEMAP_PATHS) {
      const candidate = `${origin}${path}`;
      const result = await fileProcessingService.fetchUrl(candidate, {
        timeout: 10000,
        maxRetries: 0,
        accept: 'application/xml,text/xml,*/*;q=0.8',
        binary: path.endsWith('.gz'),
      });

      if (!result.success) continue;

      const body = this.decodeSitemapBody(result, candidate);
      if (body && /<(urlset|sitemapindex)/i.test(body)) {
        return { sitemaps: [candidate], discoveredVia: 'chemin conventionnel' };
      }
    }

    if (homepageHtml) {
      const $ = cheerio.load(homepageHtml);
      const href = $('link[rel="sitemap"]').attr('href');
      if (href) {
        return {
          sitemaps: [new URL(href, origin).toString()],
          discoveredVia: 'balise <link rel="sitemap">',
        };
      }
    }

    return { sitemaps: [], discoveredVia: null };
  }

  // Décompresser si besoin et renvoyer le XML en texte
  decodeSitemapBody(fetchResult, url) {
    try {
      if (fetchResult.buffer) {
        const isGzip =
          url.endsWith('.gz') ||
          /gzip/i.test(fetchResult.contentType) ||
          (fetchResult.buffer[0] === 0x1f && fetchResult.buffer[1] === 0x8b);
        const raw = isGzip ? zlib.gunzipSync(fetchResult.buffer) : fetchResult.buffer;
        return raw.toString('utf8');
      }
      return fetchResult.html;
    } catch (_) {
      // Décompression impossible : on ignore ce sitemap plutôt que de casser le crawl
      return null;
    }
  }

  // Analyser un XML de sitemap : URLs de pages et sous-sitemaps
  parseSitemap(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });

    const nested = $('sitemapindex > sitemap > loc')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    const urls = $('urlset > url')
      .map((_, el) => {
        const node = $(el);
        return {
          loc: node.find('loc').first().text().trim(),
          lastmod: node.find('lastmod').first().text().trim() || null,
        };
      })
      .get()
      .filter((entry) => entry.loc);

    return { urls, nested };
  }

  // Collecter les URLs de pages en suivant récursivement les index de sitemaps
  async collectFromSitemaps(sitemapUrls, options = {}) {
    const { maxPages = DEFAULTS.maxPages, maxSitemapIndexDepth = DEFAULTS.maxSitemapIndexDepth } = options;

    const collected = [];
    const visited = new Set();
    const queue = sitemapUrls.map((url) => ({ url, depth: 0 }));

    while (queue.length > 0) {
      const { url, depth } = queue.shift();
      if (visited.has(url) || depth > maxSitemapIndexDepth) continue;
      visited.add(url);

      const result = await fileProcessingService.fetchUrl(url, {
        timeout: 15000,
        maxRetries: 0,
        accept: 'application/xml,text/xml,*/*;q=0.8',
        binary: url.endsWith('.gz'),
      });
      if (!result.success) continue;

      const xml = this.decodeSitemapBody(result, url);
      if (!xml) continue;

      const { urls, nested } = this.parseSitemap(xml);
      collected.push(...urls);

      for (const child of nested) {
        // Ignorer les sitemaps de médias : ils ne contiennent pas de pages
        if (/(image|video|news)[-_]?sitemap/i.test(child)) continue;
        queue.push({ url: child, depth: depth + 1 });
      }

      // Un gros site peut déclarer des dizaines de milliers d'URLs :
      // on arrête la collecte bien avant d'avoir tout téléchargé
      if (collected.length > maxPages * 20) break;
    }

    return collected;
  }

  // Ordonner les URLs : pages peu profondes d'abord, puis modifications récentes
  prioritizeUrls(entries) {
    return [...entries].sort((a, b) => {
      const depthA = this.pathDepth(a.loc);
      const depthB = this.pathDepth(b.loc);
      if (depthA !== depthB) return depthA - depthB;

      const dateA = a.lastmod ? Date.parse(a.lastmod) : 0;
      const dateB = b.lastmod ? Date.parse(b.lastmod) : 0;
      return (Number.isNaN(dateB) ? 0 : dateB) - (Number.isNaN(dateA) ? 0 : dateA);
    });
  }

  pathDepth(url) {
    try {
      return new URL(url).pathname.split('/').filter(Boolean).length;
    } catch (_) {
      return 99;
    }
  }

  // ----------------------------------------------------------------- URL utils

  // Normaliser une URL pour la déduplication (fragment, slash final, tracking)
  normalizeUrl(url, base) {
    try {
      const parsed = new URL(url, base);
      parsed.hash = '';

      for (const key of [...parsed.searchParams.keys()]) {
        if (TRACKING_PARAMS.test(key)) parsed.searchParams.delete(key);
      }
      parsed.searchParams.sort();

      // Le slash final n'est PAS retiré : beaucoup de serveurs distinguent /page
      // et /page/ (le premier renvoyant une redirection). Les doublons éventuels
      // sont éliminés plus loin par le hash de contenu.

      return parsed.toString();
    } catch (_) {
      return null;
    }
  }

  // L'URL appartient-elle au périmètre du crawl ?
  isInScope(url, rootUrl, includeSubdomains) {
    try {
      const target = new URL(url);
      const root = new URL(rootUrl);

      if (!['http:', 'https:'].includes(target.protocol)) return false;
      if (SKIPPED_EXTENSIONS.test(target.pathname)) return false;

      if (includeSubdomains) {
        const rootHost = root.hostname.replace(/^www\./, '');
        return target.hostname === rootHost || target.hostname.endsWith(`.${rootHost}`);
      }

      return target.hostname.replace(/^www\./, '') === root.hostname.replace(/^www\./, '');
    } catch (_) {
      return false;
    }
  }

  // Extraire les liens internes d'une page
  extractLinks(html, pageUrl, rootUrl, includeSubdomains) {
    const $ = cheerio.load(html);
    const links = new Set();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) return;

      const normalized = this.normalizeUrl(href, pageUrl);
      if (normalized && this.isInScope(normalized, rootUrl, includeSubdomains)) {
        links.add(normalized);
      }
    });

    return [...links];
  }

  // -------------------------------------------------------------- orchestration

  // Découvrir les URLs à crawler : sitemap en priorité, sinon parcours des liens
  async discoverUrls(rootUrl, options = {}) {
    const settings = { ...DEFAULTS, ...options };
    const origin = new URL(rootUrl).origin;

    const robots = await this.fetchRobots(origin);

    // La page racine sert à la fois de graine et de source pour <link rel="sitemap">
    const homepage = await fileProcessingService.fetchUrl(rootUrl, {
      timeout: settings.pageTimeout,
      maxRetries: 1,
    });

    if (!homepage.success) {
      return {
        urls: [],
        strategy: null,
        robots,
        rootFailure: { reason: homepage.reason, error: homepage.error, status: homepage.status },
      };
    }

    // Un sitemap fourni explicitement court-circuite la détection
    const explicitSitemaps = settings.sitemapUrl ? [settings.sitemapUrl] : null;
    const discovery = explicitSitemaps
      ? { sitemaps: explicitSitemaps, discoveredVia: 'fourni manuellement' }
      : await this.discoverSitemaps(origin, robots, homepage.html);

    if (discovery.sitemaps.length > 0) {
      const entries = await this.collectFromSitemaps(discovery.sitemaps, settings);

      const seen = new Set();
      const urls = this.prioritizeUrls(entries)
        .map((entry) => this.normalizeUrl(entry.loc))
        .filter((url) => url && this.isInScope(url, rootUrl, settings.includeSubdomains))
        .filter((url) => {
          if (seen.has(url)) return false;
          seen.add(url);
          return true;
        })
        .filter((url) => this.isAllowedByRobots(new URL(url).pathname, robots.disallow));

      if (urls.length > 0) {
        return {
          urls: urls.slice(0, settings.maxPages),
          strategy: 'sitemap',
          discoveredVia: discovery.discoveredVia,
          totalDeclared: entries.length,
          robots,
          homepageHtml: homepage.html,
        };
      }
    }

    // Aucun sitemap exploitable : parcours en largeur des liens internes
    return {
      urls: [],
      strategy: 'links',
      discoveredVia: null,
      robots,
      homepageHtml: homepage.html,
    };
  }

  // Parcourir un site et renvoyer les pages extraites.
  // `onPage` est appelé après chaque page (succès ou échec) pour le suivi en direct.
  async crawl(rootUrl, options = {}, onPage = null) {
    const settings = { ...DEFAULTS, ...options };
    const normalizedRoot = this.normalizeUrl(rootUrl);

    if (!normalizedRoot) {
      return this.emptyResult('URL de départ invalide', FETCH_FAILURES.UNSAFE_URL);
    }

    const discovery = await this.discoverUrls(normalizedRoot, settings);

    if (discovery.rootFailure) {
      return {
        ...this.emptyResult(
          fileProcessingService.describeFailure(
            discovery.rootFailure.reason,
            normalizedRoot,
            discovery.rootFailure.error
          ),
          discovery.rootFailure.reason
        ),
        strategy: null,
      };
    }

    const crawlDelay = discovery.robots?.crawlDelay
      ? discovery.robots.crawlDelay * 1000
      : settings.politenessDelayMs;

    const state = {
      queue: [],
      queued: new Set(),
      visited: new Set(),
      contentHashes: new Set(),
      pages: [],
      failures: [],
      consecutiveBlocks: 0,
      blocked: false,
      discovered: 0,
    };

    const enqueue = (url, depth) => {
      if (state.queued.has(url)) return;
      if (depth > settings.maxDepth) return;
      if (state.queued.size >= settings.maxPages * 4) return;
      if (!this.isAllowedByRobots(new URL(url).pathname, discovery.robots?.disallow)) return;
      state.queued.add(url);
      state.queue.push({ url, depth });
      state.discovered += 1;
    };

    if (discovery.strategy === 'sitemap') {
      discovery.urls.forEach((url) => enqueue(url, 0));
    } else {
      enqueue(normalizedRoot, 0);
    }

    const followLinks = discovery.strategy !== 'sitemap';

    // Pool de workers : `concurrency` pages en vol, avec délai de politesse
    const worker = async () => {
      while (state.queue.length > 0 && state.pages.length < settings.maxPages && !state.blocked) {
        const item = state.queue.shift();
        if (!item || state.visited.has(item.url)) continue;
        state.visited.add(item.url);

        const result = await fileProcessingService.processUrl(item.url, {
          timeout: settings.pageTimeout,
          maxRetries: 1,
          keepHtml: followLinks,
        });

        if (result.success) {
          state.consecutiveBlocks = 0;

          // Déduplication par contenu : le même texte servi sous plusieurs URLs
          const hash = crypto.createHash('sha256').update(result.content).digest('hex');
          if (state.contentHashes.has(hash)) {
            if (onPage) await onPage({ url: item.url, status: 'duplicate' });
            continue;
          }
          state.contentHashes.add(hash);

          state.pages.push({ ...result, depth: item.depth, contentHash: hash });
          if (onPage) await onPage({ url: item.url, status: 'indexed', page: result });

          if (followLinks && item.depth < settings.maxDepth) {
            for (const link of this.extractLinks(
              result.rawHtml || '',
              item.url,
              normalizedRoot,
              settings.includeSubdomains
            )) {
              enqueue(link, item.depth + 1);
            }
          }
        } else {
          state.failures.push({ url: item.url, reason: result.reason, error: result.error });

          if (result.reason === FETCH_FAILURES.BLOCKED) {
            state.consecutiveBlocks += 1;
            // Inutile de marteler un WAF : on arrête le crawl
            if (state.consecutiveBlocks >= settings.maxConsecutiveBlocks) {
              state.blocked = true;
            }
          } else {
            state.consecutiveBlocks = 0;
          }

          if (onPage) await onPage({ url: item.url, status: 'failed', reason: result.reason });
        }

        if (crawlDelay > 0) await fileProcessingService.sleep(crawlDelay);
      }
    };

    await Promise.all(
      Array.from({ length: Math.max(1, settings.concurrency) }, () => worker())
    );

    return {
      pages: state.pages,
      failures: state.failures,
      strategy: discovery.strategy,
      discoveredVia: discovery.discoveredVia || null,
      totalDeclared: discovery.totalDeclared || state.discovered,
      pagesDiscovered: state.discovered,
      pagesIndexed: state.pages.length,
      pagesFailed: state.failures.length,
      blocked: state.blocked,
      blockedMessage: state.blocked
        ? fileProcessingService.describeFailure(FETCH_FAILURES.BLOCKED, normalizedRoot)
        : null,
      robotsFetched: !!discovery.robots?.fetched,
    };
  }

  emptyResult(message, reason) {
    return {
      pages: [],
      failures: [],
      strategy: null,
      discoveredVia: null,
      totalDeclared: 0,
      pagesDiscovered: 0,
      pagesIndexed: 0,
      pagesFailed: 0,
      blocked: reason === FETCH_FAILURES.BLOCKED,
      blockedMessage: message,
      rootFailureReason: reason,
      robotsFetched: false,
    };
  }
}

module.exports = new SiteCrawlerService();
module.exports.DEFAULTS = DEFAULTS;

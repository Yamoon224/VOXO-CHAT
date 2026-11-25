// backend/src/services/fileProcessingService.js - Service complet pour traitement de fichiers
const axios = require('axios');
const cheerio = require('cheerio');
const { helpers } = require('../validators/knowledgeValidators');

// Causes d'échec explicites d'une récupération de page.
// Elles remontent jusqu'à l'UI pour produire un message compréhensible par le client.
const FETCH_FAILURES = {
  BLOCKED: 'BLOCKED',       // 403/429 ou page de challenge (Cloudflare, WAF, captcha)
  NOT_FOUND: 'NOT_FOUND',   // 404/410
  TIMEOUT: 'TIMEOUT',
  JS_ONLY: 'JS_ONLY',       // 200 mais contenu rendu côté client
  UNSAFE_URL: 'UNSAFE_URL', // URL locale/interne (SSRF)
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK: 'NETWORK',
};

// Marqueurs de pages de challenge anti-bot renvoyées avec un statut 200
const CHALLENGE_MARKERS = [
  'cf-browser-verification',
  '__cf_chl',
  'cf_chl_opt',
  'just a moment',
  'checking your browser',
  'enable javascript and cookies to continue',
  'ddos protection by',
  'g-recaptcha',
  'h-captcha',
  'px-captcha',
  'incapsula incident id',
];

// Seuil de contenu « confortable » : en dessous, la page est signalée comme maigre
const MIN_USEFUL_CONTENT_LENGTH = 200;
// Seuil absolu : en dessous, la page n'apporte rien d'indexable
const MIN_ACCEPTABLE_CONTENT_LENGTH = 50;

// Marqueurs d'application rendue côté client (le HTML servi est une coquille vide)
const CLIENT_RENDERED_MARKERS = [
  'id="root"',
  "id='root'",
  'id="__next"',
  'id="app"',
  "id='app'",
  'data-reactroot',
  'ng-app',
  'ng-version',
  '__nuxt__',
  'window.__initial_state__',
  'data-server-rendered',
];

// Messages destinés au client final, par cause d'échec.
// `{domain}` est remplacé par le domaine concerné.
const FAILURE_MESSAGES = {
  [FETCH_FAILURES.BLOCKED]:
    'Le site {domain} utilise une protection anti-bot qui empêche la récupération automatique. '
    + 'Vous pouvez ajouter le contenu manuellement ou importer un fichier.',
  [FETCH_FAILURES.JS_ONLY]:
    'Le site {domain} charge son contenu en JavaScript : l\'extraction automatique n\'a rien trouvé d\'exploitable. '
    + 'Vous pouvez ajouter le contenu manuellement ou importer un fichier.',
  [FETCH_FAILURES.NOT_FOUND]:
    'La page demandée est introuvable sur {domain}. Vérifiez l\'adresse saisie.',
  [FETCH_FAILURES.TIMEOUT]:
    'Le site {domain} met trop de temps à répondre. Réessayez plus tard.',
  [FETCH_FAILURES.SERVER_ERROR]:
    'Le site {domain} rencontre une erreur de son côté. Réessayez plus tard.',
  [FETCH_FAILURES.UNSAFE_URL]:
    'Cette adresse n\'est pas autorisée : seules les URLs publiques en HTTP ou HTTPS sont acceptées.',
  [FETCH_FAILURES.NETWORK]:
    'Impossible de joindre {domain}. Vérifiez que le site est bien en ligne.',
};

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; VoxoBot/1.0; +https://voxo.chat/bot)';

class FileProcessingService {
  // Requête HTTP brute avec garde SSRF, retries et classification des échecs.
  // Renvoie { success, status, html, finalUrl } ou { success: false, reason, error, status }.
  async fetchUrl(url, options = {}) {
    const {
      timeout = 15000,
      maxRetries = 2,
      userAgent = DEFAULT_USER_AGENT,
      accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      binary = false,
    } = options;

    const safety = helpers.validateUrl(url);
    if (!safety.isValid) {
      return { success: false, reason: FETCH_FAILURES.UNSAFE_URL, error: safety.error };
    }

    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      try {
        const response = await axios.get(url, {
          timeout,
          maxRedirects: 5,
          responseType: binary ? 'arraybuffer' : 'text',
          decompress: true,
          // Les redirections peuvent pointer vers une IP interne : on revalide à chaque saut
          beforeRedirect: (redirectOptions) => {
            const check = helpers.validateUrl(redirectOptions.href);
            if (!check.isValid) {
              const err = new Error(`Redirection vers une URL non autorisée: ${check.error}`);
              err.voxoReason = FETCH_FAILURES.UNSAFE_URL;
              throw err;
            }
          },
          headers: {
            'User-Agent': userAgent,
            Accept: accept,
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          },
        });

        return {
          success: true,
          status: response.status,
          html: binary ? '' : (typeof response.data === 'string' ? response.data : String(response.data ?? '')),
          buffer: binary ? Buffer.from(response.data) : null,
          contentType: response.headers?.['content-type'] || '',
          finalUrl: response.request?.res?.responseUrl || url,
        };
      } catch (error) {
        lastError = error;

        if (error.voxoReason === FETCH_FAILURES.UNSAFE_URL) {
          return { success: false, reason: FETCH_FAILURES.UNSAFE_URL, error: error.message };
        }

        const status = error.response?.status;
        const retryable = status === 429 || status === 503 || status === 502 || status === 504;

        if (retryable && attempt < maxRetries) {
          const retryAfter = Number(error.response?.headers?.['retry-after']);
          const backoff = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 30000)
            : Math.min(1000 * 2 ** attempt, 8000);
          await this.sleep(backoff);
          attempt += 1;
          continue;
        }

        return { success: false, ...this.classifyFetchError(error) };
      }
    }

    return { success: false, ...this.classifyFetchError(lastError) };
  }

  // Traduire une erreur axios en cause explicite
  classifyFetchError(error) {
    const status = error?.response?.status;

    if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
      return {
        reason: FETCH_FAILURES.TIMEOUT,
        status,
        error: 'Le site n\'a pas répondu dans le délai imparti',
      };
    }

    if (status === 403 || status === 401 || status === 429) {
      return {
        reason: FETCH_FAILURES.BLOCKED,
        status,
        error: `Le site refuse la récupération automatique (HTTP ${status})`,
      };
    }

    if (status === 404 || status === 410) {
      return {
        reason: FETCH_FAILURES.NOT_FOUND,
        status,
        error: `Page introuvable (HTTP ${status})`,
      };
    }

    if (status && status >= 500) {
      return {
        reason: FETCH_FAILURES.SERVER_ERROR,
        status,
        error: `Le site a renvoyé une erreur serveur (HTTP ${status})`,
      };
    }

    return {
      reason: FETCH_FAILURES.NETWORK,
      status,
      error: `Site injoignable: ${error?.message || 'erreur réseau'}`,
    };
  }

  // Détecter une coquille d'application rendue côté client.
  // À n'utiliser qu'en complément d'un contenu extrait maigre : beaucoup de sites
  // rendus serveur embarquent aussi ces marqueurs tout en servant leur contenu.
  looksLikeClientRendered(html) {
    if (!html) return false;
    const sample = html.slice(0, 30000).toLowerCase();

    if (CLIENT_RENDERED_MARKERS.some((marker) => sample.includes(marker))) return true;

    // Beaucoup de bundles JS et presque pas de texte : même conclusion
    const scriptCount = (sample.match(/<script[\s>]/g) || []).length;
    return scriptCount >= 3;
  }

  // Détecter une page de challenge anti-bot renvoyée avec un statut 200
  isChallengePage(html) {
    if (!html) return false;
    const sample = html.slice(0, 20000).toLowerCase();
    return CHALLENGE_MARKERS.some((marker) => sample.includes(marker));
  }

  // Extraction du contenu utile via cheerio (titre + texte principal)
  extractContent(html, url) {
    const $ = cheerio.load(html);

    $('script, style, noscript, iframe, svg, nav, header, footer, aside, form').remove();
    $('[role="navigation"], [role="banner"], [role="contentinfo"], [aria-hidden="true"]').remove();

    // cheerio concatène le texte des blocs sans séparateur : on réinjecte des sauts
    // de ligne, qui servent aussi de frontières au découpage RAG.
    $('p, br, hr, li, tr, h1, h2, h3, h4, h5, h6, div, section, article, blockquote, pre, td')
      .after('\n');

    // Le contenu principal en priorité, sinon le body entier
    const candidates = ['main', 'article', '[role="main"]', '#content', '.content', 'body'];
    let text = '';
    for (const selector of candidates) {
      const node = $(selector).first();
      if (node.length) {
        text = node.text();
        if (this.normalizeExtractedText(text).length >= MIN_USEFUL_CONTENT_LENGTH) break;
      }
    }

    const content = this.normalizeExtractedText(text);

    const title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('title').first().text().trim() ||
      $('h1').first().text().trim() ||
      new URL(url).hostname;

    const description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null;

    return { title: title.slice(0, 500), content, description };
  }

  // Détecter une redirection côté page (meta refresh ou window.location).
  // Les générateurs de sites statiques en produisent pour les anciennes URLs.
  findClientRedirect(html, baseUrl) {
    if (!html || html.length > 4000) return null;

    const metaRefresh = html.match(
      /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'\s>]+)/i
    );
    const jsRedirect = html.match(
      /(?:window\.)?location\.(?:replace|href)\s*(?:\(|=)\s*["']([^"']+)["']/i
    );

    const target = metaRefresh?.[1] || jsRedirect?.[1];
    if (!target) return null;

    try {
      const resolved = new URL(target, baseUrl).toString();
      return resolved === baseUrl ? null : resolved;
    } catch (_) {
      return null;
    }
  }

  // Traitement d'URLs — récupération + extraction d'une page unique
  async processUrl(url, options = {}) {
    const { maxClientRedirects = 2 } = options;
    let fetched = await this.fetchUrl(url, options);

    // Suivre les redirections de page (non gérées par axios)
    let hops = 0;
    while (fetched.success && hops < maxClientRedirects) {
      const target = this.findClientRedirect(fetched.html, fetched.finalUrl || url);
      if (!target) break;

      const next = await this.fetchUrl(target, options);
      if (!next.success) break;

      fetched = next;
      hops += 1;
    }

    if (!fetched.success) {
      return {
        success: false,
        reason: fetched.reason,
        status: fetched.status,
        error: `Impossible de récupérer le contenu de l'URL: ${fetched.error}`,
      };
    }

    // Statut 200 mais page de challenge : c'est un blocage déguisé
    if (this.isChallengePage(fetched.html)) {
      return {
        success: false,
        reason: FETCH_FAILURES.BLOCKED,
        status: fetched.status,
        error: 'Le site est protégé par un système anti-bot (challenge détecté)',
      };
    }

    const urlObj = new URL(fetched.finalUrl || url);
    const { title, content, description } = this.extractContent(fetched.html, fetched.finalUrl || url);

    // Contenu insuffisant : soit la page est vide, soit c'est une coquille SPA.
    // Une page courte mais réelle (mentions légales, contact...) reste acceptée.
    const isTooShort = content.length < MIN_ACCEPTABLE_CONTENT_LENGTH;
    const isThinAndClientRendered =
      content.length < MIN_USEFUL_CONTENT_LENGTH && this.looksLikeClientRendered(fetched.html);

    if (isTooShort || isThinAndClientRendered) {
      return {
        success: false,
        reason: FETCH_FAILURES.JS_ONLY,
        status: fetched.status,
        error: 'Aucun contenu exploitable : la page charge probablement son contenu en JavaScript',
      };
    }

    return {
      success: true,
      title,
      content,
      sourceType: 'url',
      sourceUrl: fetched.finalUrl || url,
      // Conservé uniquement pour le crawl (extraction des liens) : coûteux en mémoire
      rawHtml: options.keepHtml ? fetched.html : undefined,
      metadata: {
        url: fetched.finalUrl || url,
        requestedUrl: url,
        domain: urlObj.hostname,
        description,
        fetchedAt: new Date().toISOString(),
        contentLength: content.length,
        thinContent: content.length < MIN_USEFUL_CONTENT_LENGTH,
      },
    };
  }

  // Message compréhensible par le client pour une cause d'échec donnée
  describeFailure(reason, url, fallback) {
    let domain = 'ce site';
    try {
      domain = new URL(url).hostname;
    } catch (_) {
      // URL inexploitable : on garde le libellé générique
    }

    const template = FAILURE_MESSAGES[reason];
    if (!template) return fallback || 'La récupération du contenu a échoué.';
    return template.replace(/\{domain\}/g, domain);
  }

  // Normaliser le texte extrait : espaces compactés, lignes vides multiples réduites
  normalizeExtractedText(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .replace(/[^\S\n]+/g, ' ')   // espaces horizontaux compactés, sauts préservés
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Génération automatique de tags
  generateTags(title, content, sourceType) {
    const tags = [];
    
    // Tags basés sur le type de source
    tags.push(sourceType);
    
    // Tags basés sur le contenu (mots-clés simples)
    const keywords = [
      'aide', 'support', 'guide', 'documentation', 'faq',
      'tarif', 'prix', 'facturation', 'abonnement',
      'installation', 'configuration', 'paramètres',
      'api', 'intégration', 'développement'
    ];
    
    const lowerContent = (title + ' ' + content).toLowerCase();
    keywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return [...new Set(tags)].slice(0, 5); // Maximum 5 tags uniques
  }

  // Validation des données avant sauvegarde
  validateKnowledgeData(data) {
    const errors = [];
    
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Le titre est requis');
    }
    if (data.title && data.title.length > 500) {
      errors.push('Le titre ne peut pas dépasser 500 caractères');
    }
    
    if (!data.content || data.content.trim().length === 0) {
      errors.push('Le contenu est requis');
    }
    if (data.content && data.content.length > 10000) {
      errors.push('Le contenu ne peut pas dépasser 10000 caractères');
    }
    
    if (data.sourceUrl && !this.isValidUrl(data.sourceUrl)) {
      errors.push('URL source invalide');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validation d'URL
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

const fileProcessingService = new FileProcessingService();

module.exports = fileProcessingService;
module.exports.FETCH_FAILURES = FETCH_FAILURES;
module.exports.MIN_USEFUL_CONTENT_LENGTH = MIN_USEFUL_CONTENT_LENGTH;

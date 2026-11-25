jest.mock('axios');

const axios = require('axios');
const service = require('./fileProcessingService');

const { FETCH_FAILURES } = service;

const httpError = (status, headers = {}) => {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, headers };
  return error;
};

const htmlResponse = (html, url = 'https://example.com/p') => ({
  status: 200,
  data: html,
  headers: { 'content-type': 'text/html' },
  request: { res: { responseUrl: url } },
});

const richText = 'Contenu de documentation utile sur nos tarifs et notre api. '.repeat(8);

describe('extractContent', () => {
  test('retire la navigation, le pied de page et les scripts', () => {
    const html = `<html><head><title>Ma Page</title></head><body>
      <nav>Accueil Contact</nav>
      <main><h1>Bienvenue</h1><p>${richText}</p></main>
      <footer>Mentions légales</footer>
      <script>var x = 1;</script>
    </body></html>`;

    const { content, title } = service.extractContent(html, 'https://example.com/p');

    expect(title).toBe('Ma Page');
    expect(content).not.toContain('Accueil Contact');
    expect(content).not.toContain('Mentions légales');
    expect(content).not.toContain('var x');
    expect(content).toContain('Bienvenue');
  });

  test('sépare les blocs au lieu de coller le texte', () => {
    const html = `<body><main><h1>Titre</h1><p>Paragraphe.</p><ul><li>A</li><li>B</li></ul>
      <p>${richText}</p></main></body>`;

    const { content } = service.extractContent(html, 'https://example.com/p');

    expect(content).not.toContain('TitreParagraphe');
    expect(content).toContain('Titre\nParagraphe.');
  });

  test('privilégie og:title puis <title> puis <h1>', () => {
    const withOg = '<head><meta property="og:title" content="Titre OG"><title>Titre HTML</title></head><body></body>';
    expect(service.extractContent(withOg, 'https://example.com/p').title).toBe('Titre OG');

    const withH1 = '<head></head><body><h1>Titre H1</h1></body>';
    expect(service.extractContent(withH1, 'https://example.com/p').title).toBe('Titre H1');
  });

  test('retombe sur le nom de domaine sans titre', () => {
    expect(service.extractContent('<body><p>x</p></body>', 'https://example.com/p').title)
      .toBe('example.com');
  });
});

describe('isChallengePage', () => {
  test('détecte un challenge Cloudflare', () => {
    expect(service.isChallengePage('<html><body>Just a moment... cf-browser-verification</body></html>'))
      .toBe(true);
  });

  test('détecte un captcha', () => {
    expect(service.isChallengePage('<div class="g-recaptcha"></div>')).toBe(true);
  });

  test('ne se déclenche pas sur une page normale', () => {
    expect(service.isChallengePage(`<html><body><p>${richText}</p></body></html>`)).toBe(false);
  });
});

describe('looksLikeClientRendered', () => {
  test('détecte une coquille React/Next', () => {
    expect(service.looksLikeClientRendered('<body><div id="__next"></div></body>')).toBe(true);
    expect(service.looksLikeClientRendered('<body><div id="root"></div></body>')).toBe(true);
  });

  test('détecte une accumulation de bundles', () => {
    expect(service.looksLikeClientRendered('<script src="a.js"></script><script src="b.js"></script><script src="c.js"></script>'))
      .toBe(true);
  });

  test('ne se déclenche pas sur du HTML statique', () => {
    expect(service.looksLikeClientRendered(`<body><p>${richText}</p></body>`)).toBe(false);
  });
});

describe('classifyFetchError', () => {
  test.each([
    [403, FETCH_FAILURES.BLOCKED],
    [401, FETCH_FAILURES.BLOCKED],
    [429, FETCH_FAILURES.BLOCKED],
    [404, FETCH_FAILURES.NOT_FOUND],
    [410, FETCH_FAILURES.NOT_FOUND],
    [500, FETCH_FAILURES.SERVER_ERROR],
    [503, FETCH_FAILURES.SERVER_ERROR],
  ])('HTTP %i est classé %s', (status, expected) => {
    expect(service.classifyFetchError(httpError(status)).reason).toBe(expected);
  });

  test('classe les délais dépassés', () => {
    expect(service.classifyFetchError({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }).reason)
      .toBe(FETCH_FAILURES.TIMEOUT);
  });

  test('classe les erreurs réseau', () => {
    expect(service.classifyFetchError({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND x' }).reason)
      .toBe(FETCH_FAILURES.NETWORK);
  });
});

describe('describeFailure', () => {
  test('insère le domaine dans le message', () => {
    const message = service.describeFailure(FETCH_FAILURES.BLOCKED, 'https://boutique.example.com/a');
    expect(message).toContain('boutique.example.com');
    expect(message).toContain('anti-bot');
  });

  test('retombe sur le message générique pour une cause inconnue', () => {
    expect(service.describeFailure('INCONNU', 'https://example.com', 'secours')).toBe('secours');
  });
});

describe('findClientRedirect', () => {
  test('suit un meta refresh', () => {
    const html = '<meta http-equiv="refresh" content="0; url=https://example.com/cible/">';
    expect(service.findClientRedirect(html, 'https://example.com/source'))
      .toBe('https://example.com/cible/');
  });

  test('suit un window.location.replace', () => {
    const html = '<script>window.location.replace("/cible/");</script>';
    expect(service.findClientRedirect(html, 'https://example.com/source'))
      .toBe('https://example.com/cible/');
  });

  test('ignore une redirection vers soi-même', () => {
    const html = '<script>window.location.replace("https://example.com/source");</script>';
    expect(service.findClientRedirect(html, 'https://example.com/source')).toBeNull();
  });

  test('ignore les pages volumineuses (ce ne sont pas des stubs)', () => {
    const html = `<meta http-equiv="refresh" content="0; url=/x">${'a'.repeat(5000)}`;
    expect(service.findClientRedirect(html, 'https://example.com/source')).toBeNull();
  });
});

describe('fetchUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  test('refuse une URL interne sans émettre de requête', async () => {
    const result = await service.fetchUrl('http://169.254.169.254/latest/meta-data/');

    expect(result.success).toBe(false);
    expect(result.reason).toBe(FETCH_FAILURES.UNSAFE_URL);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('réessaie sur 429 puis réussit', async () => {
    axios.get
      .mockRejectedValueOnce(httpError(429, { 'retry-after': '0' }))
      .mockResolvedValueOnce(htmlResponse('<body>ok</body>'));

    const result = await service.fetchUrl('https://example.com/p', { maxRetries: 2 });

    expect(result.success).toBe(true);
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test('ne réessaie pas sur 404', async () => {
    axios.get.mockRejectedValue(httpError(404));

    const result = await service.fetchUrl('https://example.com/p', { maxRetries: 2 });

    expect(result.reason).toBe(FETCH_FAILURES.NOT_FOUND);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});

describe('processUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  test('extrait une page normale', async () => {
    axios.get.mockResolvedValue(htmlResponse(
      `<html><head><title>Tarifs</title></head><body><main><p>${richText}</p></main></body></html>`
    ));

    const result = await service.processUrl('https://example.com/p');

    expect(result.success).toBe(true);
    expect(result.title).toBe('Tarifs');
    expect(result.metadata.domain).toBe('example.com');
    expect(result.metadata.thinContent).toBe(false);
    // La troncature à 5000 caractères a été levée : le contenu est complet
    expect(result.content).not.toContain('...');
  });

  test('signale BLOCKED sur une page de challenge servie en 200', async () => {
    axios.get.mockResolvedValue(htmlResponse('<html><body>Just a moment... cf-browser-verification</body></html>'));

    const result = await service.processUrl('https://example.com/p');

    expect(result.success).toBe(false);
    expect(result.reason).toBe(FETCH_FAILURES.BLOCKED);
  });

  test('signale JS_ONLY sur une coquille SPA vide', async () => {
    axios.get.mockResolvedValue(htmlResponse('<html><body><div id="__next"></div></body></html>'));

    const result = await service.processUrl('https://example.com/p');

    expect(result.success).toBe(false);
    expect(result.reason).toBe(FETCH_FAILURES.JS_ONLY);
  });

  test('accepte une page courte mais réelle', async () => {
    const shortButReal = '<html><head><title>Mentions</title></head><body><main><p>'
      + 'Société Exemple SARL, 12 rue du Test, 75000 Paris. Capital de 10 000 euros. RCS Paris 123456789.'
      + '</p></main></body></html>';
    axios.get.mockResolvedValue(htmlResponse(shortButReal));

    const result = await service.processUrl('https://example.com/mentions');

    expect(result.success).toBe(true);
    expect(result.metadata.thinContent).toBe(true);
  });

  test('suit une redirection de page avant extraction', async () => {
    axios.get
      .mockResolvedValueOnce(htmlResponse(
        '<meta http-equiv="refresh" content="0; url=https://example.com/final/">',
        'https://example.com/ancien'
      ))
      .mockResolvedValueOnce(htmlResponse(
        `<html><head><title>Page finale</title></head><body><main><p>${richText}</p></main></body></html>`,
        'https://example.com/final/'
      ));

    const result = await service.processUrl('https://example.com/ancien');

    expect(result.success).toBe(true);
    expect(result.title).toBe('Page finale');
    expect(result.sourceUrl).toBe('https://example.com/final/');
  });

  test('ne conserve le HTML brut que sur demande', async () => {
    axios.get.mockResolvedValue(htmlResponse(
      `<html><head><title>T</title></head><body><main><p>${richText}</p></main></body></html>`
    ));

    const sans = await service.processUrl('https://example.com/p');
    expect(sans.rawHtml).toBeUndefined();

    const avec = await service.processUrl('https://example.com/p', { keepHtml: true });
    expect(avec.rawHtml).toContain('<title>');
  });
});

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const SwaggerParser = require('@apidevtools/swagger-parser');

const backendRoot = path.resolve(__dirname, '../..');
const repositoryRoot = path.resolve(backendRoot, '..');
const swaggerModule = path.join(backendRoot, 'src/config/swagger.js');

// Plusieurs routeurs partagent le préfixe /api/auth : les omettre ici faisait
// passer leurs routes pour « documentées sans route Express ».
const mounts = {
  authRoutes: '/api/auth',
  accountSecurityRoutes: '/api/auth',
  accountDeletionRoutes: '/api/auth',
  tenantRoutes: '/api/tenant',
  // /api/knowledge est servi par trois routeurs (lecture, écriture, debug) :
  // les omettre rendrait leurs routes invisibles au contrôle de couverture.
  knowledgeReadRoutes: '/api/knowledge',
  knowledgeWriteRoutes: '/api/knowledge',
  knowledgeDevRoutes: '/api/knowledge',
  chatRoutes: '/api/chat',
  analyticsRoutes: '/api/analytics',
  widgetRoutes: '/api/widget',
  webhookRoutes: '/api/webhooks',
};

const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const normalizePath = value => {
  const converted = value.replace(/\/:([^/]+)/g, '/{$1}');
  if (converted.length > 1) return converted.replace(/\/+$/, '');
  return converted;
};
const operationKey = (method, routePath) => `${method.toUpperCase()} ${normalizePath(routePath)}`;

const stripComments = source => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const collectExpressRoutes = () => {
  const routes = new Set();
  const routePattern = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;

  for (const [file, mount] of Object.entries(mounts)) {
    const source = stripComments(
      fs.readFileSync(path.join(backendRoot, `src/routes/${file}.js`), 'utf8'),
    );
    let match;
    while ((match = routePattern.exec(source))) {
      routes.add(operationKey(match[1], `${mount}${match[2]}`));
    }
  }

  const appSource = stripComments(fs.readFileSync(path.join(backendRoot, 'src/app.js'), 'utf8'));
  const appPattern = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = appPattern.exec(appSource))) {
    routes.add(operationKey(match[1], match[2]));
  }

  return routes;
};

const collectDocumentedRoutes = spec => {
  const routes = new Set();
  for (const [routePath, pathItem] of Object.entries(spec.paths || {})) {
    for (const method of Object.keys(pathItem)) {
      if (methods.has(method)) routes.add(operationKey(method, routePath));
    }
  }
  return routes;
};

const assertRouteCoverage = spec => {
  const expressRoutes = collectExpressRoutes();
  const documentedRoutes = collectDocumentedRoutes(spec);
  const missing = [...expressRoutes].filter(route => !documentedRoutes.has(route));
  const extra = [...documentedRoutes].filter(route => !expressRoutes.has(route));

  assert.deepStrictEqual(missing, [], `Routes Express non documentées:\n${missing.join('\n')}`);
  assert.deepStrictEqual(extra, [], `Routes Swagger sans route Express:\n${extra.join('\n')}`);
};

const assertOperationQuality = dereferenced => {
  const operationIds = new Set();

  for (const [routePath, pathItem] of Object.entries(dereferenced.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!methods.has(method)) continue;

      assert(operation.operationId, `${method.toUpperCase()} ${routePath}: operationId absent`);
      assert(!operationIds.has(operation.operationId), `operationId dupliqué: ${operation.operationId}`);
      operationIds.add(operation.operationId);
      assert(operation.tags?.length, `${operation.operationId}: tag absent`);
      assert(operation.responses && Object.keys(operation.responses).length, `${operation.operationId}: responses absent`);
      assert(Array.isArray(operation.security), `${operation.operationId}: sécurité non explicite`);

      for (const placeholder of routePath.matchAll(/{([^}]+)}/g)) {
        const isDeclared = (operation.parameters || []).some(item =>
          item.in === 'path' && item.name === placeholder[1] && item.required === true);
        assert(isDeclared, `${operation.operationId}: paramètre {${placeholder[1]}} absent`);
      }

      for (const [status, response] of Object.entries(operation.responses)) {
        const json = response.content?.['application/json'];
        if (json) {
          assert(json.schema || json.example, `${operation.operationId} ${status}: réponse JSON sans contrat`);
        }
      }
    }
  }
};

const assertSecurity = spec => {
  const publicOperations = new Set([
    'getHealth', 'getApiIndex', 'getWidgetScript',
    'registerUser', 'loginUser', 'refreshAccessToken', 'requestPasswordReset', 'resetPassword',
    'verifyEmail', 'resendEmailVerification',
    'testAuthRoutes', 'testTenantRoutes', 'testAiConnection', 'testChatRoutes',
    'testAnalyticsRoutes',
    'sendWidgetMessage', 'getWidgetConversation', 'endWidgetConversation', 'submitWidgetMessageFeedback', 'getWidgetConfig',
    'getWidgetHealth', 'getWidgetQuickReplies', 'reportWidgetIssue', 'testWidgetRoutes',
    'timeoutWidgetConversation', 'completeMicrosoftOAuth',
    'receiveTelegramWebhook', 'receiveWhatsAppWebhook',
  ]);

  for (const pathItem of Object.values(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!methods.has(method)) continue;
      if (operation.operationId === 'sendChatMessage') {
        assert.deepStrictEqual(operation.security, [{ bearerAuth: [] }, {}]);
      } else if (publicOperations.has(operation.operationId)) {
        assert.deepStrictEqual(operation.security, [], `${operation.operationId} devrait être public`);
      } else {
        assert.deepStrictEqual(
          operation.security,
          [{ bearerAuth: [] }],
          `${operation.operationId} devrait exiger bearerAuth`,
        );
      }
    }
  }
};

const loadSpecFrom = (cwd, nodeEnv = 'development') => {
  const script = `process.stdout.write(JSON.stringify(require(${JSON.stringify(swaggerModule)})))`;
  return JSON.parse(execFileSync(process.execPath, ['-e', script], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: nodeEnv,
      DOTENV_CONFIG_QUIET: 'true',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://swagger:swagger@localhost:5432/swagger',
    },
  }));
};

const run = async () => {
  const fromBackend = loadSpecFrom(backendRoot);
  const fromRepository = loadSpecFrom(repositoryRoot);
  assert.deepStrictEqual(fromRepository, fromBackend, 'Le Swagger dépend du répertoire courant');

  const dereferenced = await SwaggerParser.validate(fromBackend);
  assertRouteCoverage(fromBackend);
  assertOperationQuality(dereferenced);
  assertSecurity(fromBackend);

  const production = loadSpecFrom(backendRoot, 'production');
  await SwaggerParser.validate(production);
  const productionOperations = Object.values(production.paths)
    .flatMap(pathItem => Object.values(pathItem))
    .filter(operation => operation && operation.operationId);
  assert(
    productionOperations.every(operation => operation['x-development-only'] !== true),
    'Une route Development est encore publiée en production',
  );
  assert(!production.tags.some(tag => tag.name === 'Development'), 'Le tag Development est publié');
  assert(
    !production.components.parameters.TenantQuery,
    'Le paramètre tenantId de développement est publié en production',
  );

  const developmentCount = [...collectDocumentedRoutes(fromBackend)].length;
  const productionCount = [...collectDocumentedRoutes(production)].length;
  assert(productionCount < developmentCount, 'Aucune route de développement n’a été filtrée');

  console.log(`Swagger valide: ${developmentCount} opérations en développement, ${productionCount} en production.`);
};

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

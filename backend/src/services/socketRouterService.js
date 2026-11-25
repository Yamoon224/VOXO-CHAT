const { WebSocketServer } = require('ws');
const { URL } = require('url');

const routes = [];

function registerSocketRoute(match, authorize, connect) { routes.push({ match, authorize, connect, wss: new WebSocketServer({ noServer: true }) }); }
function attachSocketRouter(server) {
  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost');
    const route = routes.find(item => item.match(url.pathname));
    if (!route) return socket.destroy();
    const context = await route.authorize(request, url).catch(() => null);
    if (!context) return socket.destroy();
    route.wss.handleUpgrade(request, socket, head, ws => setupSocket(ws, context, route.connect));
  });
}

function setupSocket(ws, context, connect) {
  let alive = true;
  ws.on('pong', () => { alive = true; });
  const heartbeat = setInterval(() => { if (!alive) return ws.terminate(); alive = false; ws.ping(); }, 30000);
  const expiry = context.expiresAt ? setTimeout(() => ws.close(4001, 'Session expirÃ©e'), Math.max(context.expiresAt - Date.now(), 0)) : null;
  ws.once('close', () => { clearInterval(heartbeat); if (expiry) clearTimeout(expiry); });
  connect(ws, context);
}

module.exports = { registerSocketRoute, attachSocketRouter };

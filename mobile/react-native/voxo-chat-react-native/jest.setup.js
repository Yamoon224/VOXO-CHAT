// Les tests du core ne touchent aucun module natif : les adaptateurs sont
// injectés. Ce fichier ne pose donc que ce que l'environnement Node ne fournit
// pas et dont le SDK a besoin.

// `fetch` et `WebSocket` sont remplacés test par test ; on garantit seulement
// que les globales existent pour que les modules se chargent.
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = class {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
  };
}

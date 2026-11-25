// backend/src/validators/joiMessage.js
// Routage des messages Joi par code stable.
//
// Les schémas Joi sont des constantes de module : ils sont construits une seule
// fois à l'import, bien avant qu'une requête (et donc une locale) n'existe.
// `joiMessage(code)` retourne donc le texte français du registre — comportement
// identique à celui d'avant la migration — mais la chaîne n'est plus écrite en
// dur dans le schéma : elle vient de MESSAGES, ce qui permet de basculer plus
// tard sur une résolution par locale sans retoucher les 12 fichiers de
// validateurs.
//
// À noter : `validationMiddleware.validate` remplace de toute façon le détail
// Joi par le code générique VALIDATION_ERROR côté réponse, donc ces textes ne
// sont aujourd'hui visibles que dans les logs et sur le canal query/params.
const { messageFor } = require('../i18n/messages');

const joiMessage = (code, locale = 'fr') => messageFor(code, locale);

module.exports = { joiMessage };

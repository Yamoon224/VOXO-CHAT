const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/authMiddleware');
const { validate, validateParams } = require('../middleware/validationMiddleware');
const supportController = require('../controllers/supportController');
const {
  createTicketSchema,
  replyTicketSchema,
  supportResourceParamsSchema,
} = require('../validators/supportValidators');

const router = express.Router();

// Ouvrir une demande est gratuit et non authentifié par permission : on borne
// donc le débit pour qu'un compte ne puisse pas inonder la boîte de réception.
const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de demandes envoyées. Réessayez plus tard.' },
});

/**
 * Volontairement gardé par `authenticate` SEUL, sans `requirePermission` —
 * même choix que `/tenant/profile` et `/tenant/quota` : tout membre doit
 * pouvoir signaler un problème, y compris celui qui n'a accès à rien d'autre.
 * La règle « qui lit quelle demande » vit dans le service, car elle dépend de
 * l'auteur du ticket et non d'une ressource.
 */
router.use(authenticate);

router.get('/', supportController.listTickets);
router.post('/', ticketLimiter, validate(createTicketSchema), supportController.createTicket);
router.get(
  '/:id',
  validateParams(supportResourceParamsSchema),
  supportController.getTicket
);
router.post(
  '/:id/messages',
  ticketLimiter,
  validateParams(supportResourceParamsSchema),
  validate(replyTicketSchema),
  supportController.replyToTicket
);

module.exports = router;

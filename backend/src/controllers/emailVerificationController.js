// src/controllers/emailVerificationController.js
const { successResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');
const emailVerificationService = require('../services/emailVerificationService');
const authSessionService = require('../services/authSessionService');

// Message volontairement identique que le compte existe ou non
const NEUTRAL_RESEND_MESSAGE = 'Si un compte existe pour cet email, un nouveau lien vient d’être envoyé';

// Confirmer l'adresse email via le jeton reçu par email
const verifyEmail = async (req, res, next) => {
  try {
    const { user, tenant } = await emailVerificationService.confirmVerification(req.body.token);

    successResponse(
      res,
      await authSessionService.buildSession(user, tenant),
      'Adresse email confirmée. Bienvenue !'
    );
  } catch (error) {
    next(error);
  }
};

// Renvoyer un lien de vérification
const resendVerification = async (req, res, next) => {
  try {
    const outcome = await emailVerificationService.resendVerification(req.body.email);

    // Une panne du fournisseur ne révèle rien sur l'existence du compte :
    // la signaler évite d'afficher un faux succès à l'utilisateur.
    if (outcome === 'failed') {
      return next(new AppError('L’email n’a pas pu être envoyé. Veuillez réessayer.', 502, {
        code: 'EMAIL_SEND_FAILED',
      }));
    }

    // 'sent' et 'skipped' partagent la même réponse : l'existence du compte
    // ne doit pas transparaître.
    successResponse(res, null, NEUTRAL_RESEND_MESSAGE);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyEmail,
  resendVerification,
};

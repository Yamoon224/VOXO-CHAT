// src/controllers/passwordController.js
const { User, Tenant } = require('../models');
const { successResponse } = require('../utils/responseUtils');
const { AppError } = require('../middleware/errorMiddleware');
const passwordResetService = require('../services/passwordResetService');

// Message volontairement identique que le compte existe ou non
const NEUTRAL_FORGOT_MESSAGE = 'Si cet email existe, vous recevrez un lien de réinitialisation';

// Demander une réinitialisation de mot de passe
const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.email, isActive: true },
      include: [{ model: Tenant, as: 'tenant', where: { isActive: true } }],
    });

    if (user) {
      // Best effort : un échec d'envoi ne doit pas révéler l'existence du compte
      await passwordResetService.requestReset(user);
    }

    successResponse(res, null, NEUTRAL_FORGOT_MESSAGE, 200, 'PASSWORD_RESET_NEUTRAL');
  } catch (error) {
    next(error);
  }
};

// Réinitialiser le mot de passe via le jeton reçu par email
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return next(new AppError('Les mots de passe ne correspondent pas', 400, { code: 'PASSWORDS_MISMATCH' }));
    }

    await passwordResetService.confirmReset({ token, newPassword });

    successResponse(res, null, 'Mot de passe réinitialisé avec succès', 200, 'PASSWORD_RESET_SUCCESS');
  } catch (error) {
    next(error);
  }
};

// Changer le mot de passe depuis un compte connecté
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const user = req.user;

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return next(new AppError('Mot de passe actuel incorrect', 400, { code: 'INVALID_PASSWORD' }));
    }

    if (newPassword !== confirmNewPassword) {
      return next(new AppError('Les nouveaux mots de passe ne correspondent pas', 400, { code: 'PASSWORDS_MISMATCH' }));
    }

    user.password = newPassword; // Le hash est fait par le hook beforeUpdate
    await user.save();
    await passwordResetService.notifyPasswordChanged(user);

    successResponse(res, null, 'Mot de passe changé avec succès', 200, 'PASSWORD_CHANGED');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
  changePassword,
};

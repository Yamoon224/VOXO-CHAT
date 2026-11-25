const accountDeletionService = require('../services/accountDeletionService');
const { successResponse } = require('../utils/responseUtils');

/**
 * Ce que la suppression va réellement entraîner : transfert de propriété
 * obligatoire, ou disparition de l'entreprise. Consulté avant toute confirmation.
 */
const getDeletionPreview = async (req, res, next) => {
  try {
    const preview = await accountDeletionService.getDeletionPreview(req.user);
    successResponse(res, preview, 'Aperçu de suppression récupéré');
  } catch (error) {
    next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { currentPassword, newOwnerId, confirmCompanyDeletion } = req.body;
    const result = await accountDeletionService.deleteAccount({
      user: req.user,
      currentPassword,
      newOwnerId,
      confirmCompanyDeletion,
    });

    const message = result.scope === 'company'
      ? 'Compte et entreprise supprimés'
      : 'Compte supprimé';
    successResponse(res, { scope: result.scope, purgeAt: result.purgeAt }, message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDeletionPreview,
  deleteAccount,
};

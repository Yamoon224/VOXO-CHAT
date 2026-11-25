const invitationService = require('../services/teamInvitationService');
const { successResponse } = require('../utils/responseUtils');

const acceptInvitation = async (req, res, next) => {
  try {
    const user = await invitationService.acceptInvitation(req.body);
    successResponse(res, user, 'Invitation acceptée. Vous pouvez maintenant vous connecter.', 201);
  } catch (error) {
    next(error);
  }
};

module.exports = { acceptInvitation };

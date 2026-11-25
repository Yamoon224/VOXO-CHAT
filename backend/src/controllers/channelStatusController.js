const channelSettingsService = require('../services/channelSettingsService');

async function getChannelsStatus(req, res) {
  try {
    const tenant = req.tenant;

    return res.json({
      success: true,
      data: channelSettingsService.sanitizeChannelStatus(tenant.settings?.channels || {}),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'Impossible de recuperer le statut des canaux',
    });
  }
}

module.exports = {
  getChannelsStatus,
};

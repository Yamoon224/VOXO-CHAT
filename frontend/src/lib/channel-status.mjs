export const defaultTelegramStatus = {
  botToken: '',
  botTokenConfigured: false,
  botUsername: null,
  botFirstName: null,
  botId: null,
  webhookActive: false,
  lastError: null,
}

export const defaultWhatsAppStatus = {
  provider: 'meta',
  phoneNumberId: '',
  displayPhoneNumber: null,
  verifiedName: null,
  webhookActive: false,
  qualityRating: null,
  lastError: null,
}

export function mergeTelegramStatus(previous = {}, next = {}) {
  return {
    ...defaultTelegramStatus,
    ...previous,
    ...next,
    botToken: previous.botToken || next.botToken || '',
  }
}

export function mergeWhatsAppStatus(previous = {}, next = {}) {
  return {
    ...defaultWhatsAppStatus,
    ...previous,
    ...next,
    phoneNumberId: next.phoneNumberId || previous.phoneNumberId || '',
  }
}

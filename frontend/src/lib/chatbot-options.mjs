export const DEFAULT_WIDGET_FEATURES = Object.freeze({
  messageFeedback: true,
  conversationRating: true,
  showTimestamps: true,
  showDeliveryStatus: true,
  dateSeparators: true,
  connectivityStatus: true,
  attachments: false,
  // Diffusion du texte en cours de frappe : opt-in explicite du tenant.
  liveTypingPreview: false,
  agentActions: false
});

export function normalizeChatbotOptions(options = {}) {
  return {
    ...options,
    ui: { ...(options.ui || {}) },
    features: {
      ...DEFAULT_WIDGET_FEATURES,
      ...(options.features || {})
    }
  };
}

export function mergeChatbotOptions(current = {}, imported = {}) {
  return normalizeChatbotOptions({
    ...current,
    ...imported,
    features: {
      ...current.features,
      ...imported.features
    }
  });
}

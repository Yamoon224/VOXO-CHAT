export const PRICING_HEADER = { title: 'No surprises. No hidden fees.', accent: 'Pricing that scales with your growth.' };
export const PRICING_PLANS = [
  { id: 'free', name: 'Free', price: '€0', period: 'forever', tagline: 'Try VOXO on a real use case.', ctaLabel: 'Get started for free', features: ['100 messages per month', '3 knowledge base documents', 'Website widget', 'Basic analytics'] },
  { id: 'basic', name: 'Basic', price: '€29', period: 'per month', tagline: 'For a small team handling real volume.', featured: true, ctaLabel: 'Get started for free', features: ['500 messages per month', '10 knowledge base documents', 'WhatsApp, Telegram and Messenger', 'Lead capture', 'Unified inbox'] },
  { id: 'pro', name: 'Pro', price: '€99', period: 'per month', tagline: 'For support operating at full speed.', ctaLabel: 'Get started for free', features: ['Unlimited messages', 'Unlimited knowledge base', 'All channels', 'Advanced analytics and sentiment', 'Priority support'] },
];
export const PRICING_ENTERPRISE = { name: 'Enterprise', text: 'High volumes, contractual commitments, specific compliance requirements or dedicated assistance?', ctaLabel: 'Let’s talk' };
export const PRICING_COPY = {
  currency: 'Currency', unavailable: 'Price coming soon', loading: 'Loading…', perYear: 'per year', perMonth: 'per month', featured: 'Most popular',
  unlimitedMessages: 'Unlimited messages', unlimitedDocuments: 'Unlimited documents', messagesPerMonth: count => `${count} messages per month`, documents: count => `${count} documents`,
  fallbackTagline: 'A VOXO plan tailored to your business.', fallbackCta: 'Get started for free',
  features: { analytics: 'Advanced analytics', customBranding: 'Custom branding', leadGeneration: 'Lead capture', customAiInstructions: 'Custom AI instructions' },
};

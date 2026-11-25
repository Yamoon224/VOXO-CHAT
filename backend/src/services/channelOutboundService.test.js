jest.mock('./telegramService', () => ({ sendMessage: jest.fn(), sendPhoto: jest.fn(), sendDocument: jest.fn() }));
jest.mock('./whatsappService', () => ({ sendMessage: jest.fn(), sendImage: jest.fn(), sendDocument: jest.fn() }));
jest.mock('./storageService', () => ({ createSignedUrl: jest.fn() }));

const telegramService = require('./telegramService');
const whatsappService = require('./whatsappService');
const service = require('./channelOutboundService');

const tenant = { id: 'tenant-a', settings: { channels: { telegram: { botToken: 'token-a' }, whatsapp: { phoneNumberId: 'phone-a', accessToken: 'token-wa' } } } };

function conversation(overrides = {}) {
  return { channel: 'telegram', metadata: {}, externalUserId: null, ...overrides };
}

describe('channelOutboundService.sendChannelMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('n’envoie rien pour une conversation du widget web', async () => {
    await service.sendChannelMessage(tenant, conversation({ channel: 'web' }), 'Bonjour');
    expect(telegramService.sendMessage).not.toHaveBeenCalled();
  });

  test('privilégie externalConversationId quand les trois sources existent', async () => {
    const target = conversation({ metadata: { externalConversationId: '111', chatId: '222' }, externalUserId: '333' });
    await service.sendChannelMessage(tenant, target, 'Bonjour');
    expect(telegramService.sendMessage).toHaveBeenCalledWith('token-a', '111', 'Bonjour', { removeKeyboard: true });
  });

  test('retombe sur chatId pour les conversations antérieures à l’unification des métadonnées', async () => {
    const target = conversation({ metadata: { chatId: '8168934091' }, externalUserId: '8168934091' });
    await service.sendChannelMessage(tenant, target, 'Bonjour');
    expect(telegramService.sendMessage).toHaveBeenCalledWith('token-a', '8168934091', 'Bonjour', { removeKeyboard: true });
  });

  test('retombe sur externalUserId quand aucune métadonnée ne porte le destinataire', async () => {
    await service.sendChannelMessage(tenant, conversation({ externalUserId: '7162714839' }), 'Bonjour');
    expect(telegramService.sendMessage).toHaveBeenCalledWith('token-a', '7162714839', 'Bonjour', { removeKeyboard: true });
  });

  test('applique le même repli sur WhatsApp', async () => {
    const target = conversation({ channel: 'whatsapp', metadata: { chatId: '2250700000000@c.us' } });
    await service.sendChannelMessage(tenant, target, 'Bonjour');
    expect(whatsappService.sendMessage).toHaveBeenCalledWith('phone-a', 'token-wa', '2250700000000@c.us', 'Bonjour');
  });

  test('refuse l’envoi quand aucun destinataire n’est connu', async () => {
    await expect(service.sendChannelMessage(tenant, conversation(), 'Bonjour'))
      .rejects.toMatchObject({ code: 'CHANNEL_DESTINATION_MISSING' });
    expect(telegramService.sendMessage).not.toHaveBeenCalled();
  });

  test('refuse l’envoi Telegram quand le bot n’est pas configuré', async () => {
    const bare = { id: 'tenant-b', settings: {} };
    await expect(service.sendChannelMessage(bare, conversation({ externalUserId: '1' }), 'Bonjour'))
      .rejects.toMatchObject({ code: 'CHANNEL_NOT_CONFIGURED' });
  });
});

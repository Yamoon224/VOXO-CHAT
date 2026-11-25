jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../config/config', () => ({ oneSignal: { appId: 'app-id', restApiKey: 'rest-key' }, app: { frontendUrl: 'https://app.voxo.test' } }));

const axios = require('axios');
const service = require('./oneSignalService');

describe('oneSignalService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('préfixe l’identité destinataire pour isoler les comptes', () => {
    expect(service.externalId('user', 'abc')).toBe('user:abc');
    expect(service.externalId('admin', 'abc')).toBe('admin:abc');
  });

  it('envoie le payload OneSignal avec l’URL de destination', async () => {
    axios.post.mockResolvedValue({ data: { id: 'push-id' } });
    await expect(service.send({ id: 'n1', recipientType: 'user', recipientId: 'u1', type: 'support.replied', title: 'Réponse', body: 'Le support a répondu', url: '/dashboard/support?ticket=t1' })).resolves.toBe(true);
    expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ include_aliases: { external_id: ['user:u1'] }, url: 'https://app.voxo.test/dashboard/support?ticket=t1' }), expect.any(Object));
  });

  it('absorbe les erreurs du fournisseur', async () => {
    axios.post.mockRejectedValue(new Error('indisponible'));
    await expect(service.send({ id: 'n1', recipientType: 'user', recipientId: 'u1', type: 'test', title: 'Titre', body: 'Corps' })).resolves.toBe(false);
  });
});

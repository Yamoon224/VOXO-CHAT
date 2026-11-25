jest.mock('../models', () => ({
  User: { findOne: jest.fn() },
  Tenant: {},
}));
jest.mock('./authTokenService', () => ({
  TOKEN_TYPES: { PASSWORD_RESET: 'password_reset' },
  issue: jest.fn(),
  consume: jest.fn(),
}));
jest.mock('./emailService', () => ({
  sendBestEffort: jest.fn(),
  sendPasswordChanged: jest.fn(),
}));

const { User } = require('../models');
const authTokenService = require('./authTokenService');
const emailService = require('./emailService');
const service = require('./passwordResetService');

describe('passwordResetService.confirmReset', () => {
  const buildUser = () => ({ id: 'user-1', email: 'guy@example.com', save: jest.fn() });

  beforeEach(() => {
    jest.clearAllMocks();
    authTokenService.consume.mockResolvedValue({ userId: 'user-1' });
    emailService.sendPasswordChanged.mockResolvedValue(true);
  });

  test('applies the new password and notifies the user', async () => {
    const user = buildUser();
    User.findOne.mockResolvedValue(user);

    await service.confirmReset({ token: 'raw-token', newPassword: 'Nouveau!2026' });

    expect(user.password).toBe('Nouveau!2026');
    expect(user.save).toHaveBeenCalled();
    expect(emailService.sendPasswordChanged).toHaveBeenCalled();
  });

  /**
   * Le jeton peut avoir été émis avant le blocage de l'entreprise. Sans la
   * jointure sur un tenant actif, son porteur pourrait continuer à manipuler
   * le compte après la suspension.
   */
  test('requires an active company, like the login does', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(service.confirmReset({ token: 'raw-token', newPassword: 'Nouveau!2026' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });

    expect(User.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1', isActive: true },
      include: [expect.objectContaining({ as: 'tenant', where: { isActive: true } })],
    }));
    expect(emailService.sendPasswordChanged).not.toHaveBeenCalled();
  });

  test('consumes the token before touching the account', async () => {
    User.findOne.mockResolvedValue(buildUser());

    await service.confirmReset({ token: 'raw-token', newPassword: 'Nouveau!2026' });

    expect(authTokenService.consume).toHaveBeenCalledWith('raw-token', 'password_reset');
  });
});

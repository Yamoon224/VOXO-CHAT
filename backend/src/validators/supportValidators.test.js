const { createTicketSchema } = require('./supportValidators');

const validTicket = {
  message: 'Je ne peux plus me connecter à mon espace.', reason: 'account_access',
};

describe('createTicketSchema', () => {
  test('accepts a predefined reason', () => {
    expect(createTicketSchema.validate(validTicket).error).toBeUndefined();
  });

  test('rejects an unknown reason', () => {
    expect(createTicketSchema.validate({ ...validTicket, reason: 'unknown' }).error).toBeDefined();
  });

  test('rejects a priority supplied by the tenant', () => {
    expect(createTicketSchema.validate({ ...validTicket, priority: 'high' }).error).toBeDefined();
  });

  test('requires a clear label for the other reason', () => {
    expect(createTicketSchema.validate({ ...validTicket, reason: 'other' }).error).toBeDefined();
    expect(createTicketSchema.validate({ ...validTicket, reason: 'other', otherReason: 'Besoin spécifique' }).error).toBeUndefined();
  });
});

const { AppError } = require('../middleware/errorMiddleware');

const STATUSES = new Set(['new', 'saved', 'validated']);
const ACTION_TARGET = { save: 'saved', validate: 'validated', reopen: 'saved' };

function statusOf(metadata = {}) {
  if (STATUSES.has(metadata.reviewStatus)) return metadata.reviewStatus;
  if (metadata.validatedAt && metadata.validatedBy) return 'validated';
  if (metadata.manuallyCorrected && metadata.reviewRequired) return 'saved';
  return 'new';
}

function assertTransition(status, action) {
  if (!ACTION_TARGET[action]) {
    throw new AppError('Action de révision invalide.', 400, { code: 'INVALID_REVIEW_ACTION' });
  }
  if (status === 'validated' && action !== 'reopen') {
    throw new AppError('Cette fiche est déjà validée.', 409, { code: 'PRODUCT_ALREADY_VALIDATED' });
  }
  if (action === 'reopen' && status !== 'validated') {
    throw new AppError('Seule une fiche validée peut être rouverte.', 409, {
      code: 'PRODUCT_NOT_VALIDATED',
    });
  }
}

function transitionMetadata(metadata = {}, action, userId, now = new Date()) {
  const current = statusOf(metadata);
  assertTransition(current, action);
  const timestamp = now.toISOString();
  const history = [...(metadata.reviewHistory || []), {
    action, from: current, to: ACTION_TARGET[action], userId, at: timestamp,
  }].slice(-20);
  return {
    ...metadata,
    reviewStatus: ACTION_TARGET[action],
    reviewRequired: action !== 'validate',
    validatedAt: action === 'validate' ? timestamp : null,
    validatedBy: action === 'validate' ? userId : null,
    reopenedAt: action === 'reopen' ? timestamp : metadata.reopenedAt,
    reopenedBy: action === 'reopen' ? userId : metadata.reopenedBy,
    reviewHistory: history,
  };
}

function sourceStatusForAction(action) {
  return { save: 'new', validate: 'saved', reopen: 'validated' }[action];
}

function targetStatusForAction(action) {
  return ACTION_TARGET[action];
}

module.exports = {
  STATUSES, statusOf, assertTransition, transitionMetadata,
  sourceStatusForAction, targetStatusForAction,
};

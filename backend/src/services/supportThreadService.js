const { v4: uuidv4 } = require('uuid');
const { SupportTicket, SupportMessage, sequelize } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');

/**
 * Écriture dans un fil de support.
 *
 * DEUX RÈGLES NON NÉGOCIABLES :
 *
 * 1. Une note interne (`role: 'internal_note'`) ne sort JAMAIS vers le client.
 *    Le filtrage vit ici, dans la requête (`listMessages`), et non dans le
 *    composant d'affichage : filtrer au rendu laisse la donnée voyager dans la
 *    réponse HTTP, où n'importe qui peut la lire.
 *
 * 2. L'ajout se fait sous verrou de ligne, avec une clé d'idempotence fournie
 *    par le client. Un renvoi après échec réseau ne doit pas dupliquer le
 *    message.
 */
class SupportThreadService {
  /** Messages visibles selon le point de vue. Le client ne voit que `message`. */
  async listMessages(ticketId, { includeInternal = false } = {}) {
    const where = { ticketId };
    if (!includeInternal) where.role = 'message';

    const messages = await SupportMessage.findAll({
      where,
      order: [['createdAt', 'ASC']],
    });
    return messages.map(message => this.toPublicMessage(message));
  }

  toPublicMessage(message) {
    return {
      id: message.id,
      authorType: message.authorType,
      authorName: message.authorName,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  /**
   * Ajoute un message et remonte l'activité du ticket, dans une transaction
   * unique. Le verrou porte sur la ligne du ticket : deux réponses simultanées
   * ne peuvent pas écrire un `lastMessageAt` incohérent.
   */
  async addMessage({
    ticketId, authorType, authorId, authorName, content, internal = false, clientMessageId,
  }) {
    const trimmed = String(content || '').trim();
    if (!trimmed) {
      throw new AppError('Le message ne peut pas être vide', 400, {
        code: 'SUPPORT_MESSAGE_REQUIRED',
      });
    }
    // Une note interne est par définition un acte d'administrateur.
    if (internal && authorType !== 'admin') {
      throw new AppError('Seul un administrateur peut écrire une note interne', 403, {
        code: 'SUPPORT_INTERNAL_NOTE_FORBIDDEN',
      });
    }

    const messageKey = clientMessageId || uuidv4();

    return sequelize.transaction(async (transaction) => {
      const ticket = await SupportTicket.findByPk(ticketId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!ticket) {
        throw new AppError('Demande introuvable', 404, { code: 'SUPPORT_TICKET_NOT_FOUND' });
      }
      if (ticket.status === 'closed') {
        throw new AppError('Cette demande est close', 409, { code: 'SUPPORT_TICKET_CLOSED' });
      }

      // Renvoi du même message : on rend l'existant sans rien écrire.
      const existing = await SupportMessage.findOne({
        where: { ticketId, clientMessageId: messageKey },
        transaction,
      });
      if (existing) {
        return { message: this.toPublicMessage(existing), duplicate: true };
      }

      const message = await SupportMessage.create({
        ticketId,
        authorType,
        authorId,
        authorName,
        role: internal ? 'internal_note' : 'message',
        content: trimmed,
        clientMessageId: messageKey,
      }, { transaction });

      // Une note interne n'est pas une activité visible du client : elle ne
      // rouvre pas la demande ni ne remonte le fil dans sa liste.
      if (!internal) {
        await ticket.update({
          lastMessageAt: new Date(),
          // Une réponse du client rouvre une demande résolue.
          ...(authorType === 'tenant' && ticket.status === 'resolved' && { status: 'open', resolvedAt: null }),
          // Une réponse d'admin met la demande en attente du client.
          ...(authorType === 'admin' && ticket.status === 'open' && { status: 'pending' }),
        }, { transaction });
      }

      return { message: this.toPublicMessage(message), duplicate: false };
    });
  }
}

module.exports = new SupportThreadService();

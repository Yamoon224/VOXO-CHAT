const PDFDocument = require('pdfkit');

function valueOrFallback(value, fallback = 'Non renseigné') {
  return value || fallback;
}

function messageAuthor(message, conversation) {
  return message.role === 'user'
    ? valueOrFallback(conversation.userName, 'Utilisateur')
    : 'Assistant IA';
}

function attachmentLabel(attachment) {
  const name = attachment.name || attachment.originalName || 'Fichier joint';
  const type = attachment.mimeType || attachment.type || 'type inconnu';
  const size = attachment.size || attachment.sizeBytes;
  return `${name} — ${type}${size ? ` — ${size} octets` : ''}`;
}

function addHeader(document, conversation) {
  document.fontSize(20).fillColor('#2563eb').text('Rapport de conversation');
  document.moveDown(0.5).fontSize(10).fillColor('#4b5563');
  document.text(`Généré le ${new Date().toLocaleString('fr-FR')}`);
  document.moveDown();
  document.fillColor('#111827').fontSize(11);
  document.text(`Titre : ${valueOrFallback(conversation.title, 'Conversation sans titre')}`);
  document.text(`Client : ${valueOrFallback(conversation.userName, 'Anonyme')}`);
  document.text(`Email : ${valueOrFallback(conversation.userEmail)}`);
  document.text(`Canal : ${valueOrFallback(conversation.channel, 'web')}`);
  document.text(`Statut : ${valueOrFallback(conversation.status)}`);
  document.text(`Début : ${new Date(conversation.createdAt).toLocaleString('fr-FR')}`);
  document.moveDown();
}

function addMessage(document, message, conversation) {
  const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleString('fr-FR') : '';
  document.fontSize(11).fillColor('#111827').font('Helvetica-Bold')
    .text(`${messageAuthor(message, conversation)} ${timestamp ? `— ${timestamp}` : ''}`);
  document.font('Helvetica').fontSize(10).fillColor('#374151')
    .text(valueOrFallback(message.content, 'Message sans contenu'));
  (message.attachments || []).forEach(attachment => {
    document.fontSize(9).fillColor('#6b7280').text(`Pièce jointe : ${attachmentLabel(attachment)}`);
  });
  document.moveDown();
}

function addFooter(document) {
  const range = document.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    document.switchToPage(index);
    document.fontSize(8).fillColor('#9ca3af')
      .text(`Voxo Chat — Page ${index + 1} sur ${range.count}`, 50, 780, { align: 'center' });
  }
}

function renderConversationPdf(conversation) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 50, bufferPages: true });
    const chunks = [];
    document.on('data', chunk => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));
    addHeader(document, conversation);
    (conversation.messages || []).forEach(message => addMessage(document, message, conversation));
    addFooter(document);
    document.end();
  });
}

module.exports = { renderConversationPdf };

const { validateUpload, safeFilename, looksLikeText } = require('./fileValidationService');
const { MAX_FILE_BYTES } = require('../config/fileUploads');

const pad = (header, size = 128) => Buffer.concat([Buffer.from(header), Buffer.alloc(size, 0x20)]);

const PDF = pad('%PDF-1.7\n');
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(128)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(128)]);
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(128)]);
const TEXT = Buffer.from('Bonjour, ceci est une procédure.\n');

const expectRejection = (fn, code) => {
  try {
    fn();
  } catch (error) {
    expect(error.code).toBe(code);
    expect(error.statusCode).toBeGreaterThanOrEqual(400);
    // Message destiné à l'utilisateur final : en français
    expect(error.message).toMatch(/[éèêàûô]|fichier|Format|Fichier/i);
    return;
  }
  throw new Error(`Aucune erreur ${code} levée`);
};

describe('safeFilename', () => {
  test.each([
    ['../../secret.pdf', 'secret.pdf'],
    ['..\\..\\secret.pdf', 'secret.pdf'],
    ['/etc/passwd.txt', 'passwd.txt'],
    ['', 'fichier'],
    ['...hidden.txt', 'hidden.txt'],
  ])('neutralise %s', (input, expected) => {
    expect(safeFilename(input)).toBe(expected);
  });

  test("préserve l'extension même sur un nom très long", () => {
    const result = safeFilename(`${'a'.repeat(400)}.pdf`);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith('.pdf')).toBe(true);
  });

  test('répare le nom UTF-8 reçu comme Windows-1252 avant sa sécurisation', () => {
    expect(safeFilename("Capture d'Ã©cran.png")).toBe("Capture d'écran.png");
  });
});

describe('validateUpload — formats acceptés', () => {
  test.each([
    ['doc.pdf', PDF, 'knowledge', 'document'],
    ['note.docx', DOCX, 'knowledge', 'document'],
    ['procedure.md', TEXT, 'knowledge', 'document'],
    ['photo.jpg', JPEG, 'conversation', 'image'],
    ['capture.png', PNG, 'conversation', 'image'],
  ])('accepte %s', (name, buffer, context, category) => {
    expect(validateUpload(buffer, name, '', context)).toMatchObject({ filename: name, category });
  });

  test('déduit le type MIME canonique même si le navigateur n en envoie pas', () => {
    expect(validateUpload(TEXT, 'notes.md', '', 'knowledge').mimeType).toBe('text/markdown');
  });
});

describe('validateUpload — rejets', () => {
  test('refuse une image renommée en .pdf (signature incohérente)', () => {
    expectRejection(() => validateUpload(JPEG, 'faux.pdf', 'application/pdf'), 'FILE_SIGNATURE_MISMATCH');
  });

  test('refuse un binaire renommé en .txt', () => {
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x00, 0x00]);
    expectRejection(() => validateUpload(exe, 'virus.txt', 'text/plain'), 'FILE_SIGNATURE_MISMATCH');
  });

  test('refuse un fichier vide', () => {
    expectRejection(() => validateUpload(Buffer.alloc(0), 'vide.txt', 'text/plain'), 'EMPTY_FILE');
  });

  test('refuse un fichier dépassant la limite d un octet', () => {
    const tooBig = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(MAX_FILE_BYTES)]);
    expectRejection(() => validateUpload(tooBig, 'gros.pdf', 'application/pdf'), 'FILE_TOO_LARGE');
  });

  test('accepte une image dans la base de connaissance', () => {
    expect(validateUpload(JPEG, 'photo.jpg', 'image/jpeg', 'knowledge')).toMatchObject({
      category: 'image', mimeType: 'image/jpeg'
    });
  });

  test('refuse un format hors allowlist', () => {
    expectRejection(() => validateUpload(pad('PK'), 'deck.pptx', '', 'conversation'), 'UNSUPPORTED_FILE_TYPE');
  });

  test('valide un fichier juste sous la limite', () => {
    const justUnder = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(MAX_FILE_BYTES - 5)]);
    expect(validateUpload(justUnder, 'limite.pdf', 'application/pdf').size).toBe(MAX_FILE_BYTES);
  });
});

describe('looksLikeText', () => {
  test('accepte de l UTF-8 accentué', () => {
    expect(looksLikeText(Buffer.from('Éléphant à côté'))).toBe(true);
  });

  test('rejette un contenu portant un octet nul', () => {
    expect(looksLikeText(Buffer.from([0x41, 0x00, 0x42]))).toBe(false);
  });
});

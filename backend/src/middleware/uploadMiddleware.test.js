const express = require('express');
const request = require('supertest');
const { uploadKnowledgeFile } = require('./uploadMiddleware');
const { errorHandler } = require('./errorMiddleware');

function createApp() {
  const app = express();
  app.post('/upload', uploadKnowledgeFile, (req, res) => {
    res.status(201).json({ file: { name: req.file.originalname, size: req.file.size } });
  });
  app.use(errorHandler);
  return app;
}

describe('uploadKnowledgeFile', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('accepts a multipart file named file', async () => {
    const response = await request(createApp())
      .post('/upload')
      .attach('file', Buffer.from('contenu test'), 'guide.txt');

    expect(response.status).toBe(201);
    expect(response.body.file).toEqual({ name: 'guide.txt', size: 12 });
  });

  test('normalise un nom accentué transmis en multipart', async () => {
    const response = await request(createApp())
      .post('/upload')
      .attach('file', Buffer.from('contenu test'), "Capture d'écran.txt");

    expect(response.status).toBe(201);
    expect(response.body.file.name).toBe("Capture d'écran.txt");
  });

  test('keeps NO_FILE for an empty multipart request', async () => {
    const response = await request(createApp())
      .post('/upload')
      .field('title', 'Sans fichier');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('NO_FILE');
  });

  test('explains when a JSON request cannot contain the file', async () => {
    const response = await request(createApp())
      .post('/upload')
      .send({ title: 'Document' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UPLOAD_MULTIPART_REQUIRED');
  });
});

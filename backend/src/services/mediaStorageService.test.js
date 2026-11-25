const fs = require('fs').promises;
const path = require('path');

jest.mock('../config/config', () => ({
  media: { tempTtlMs: 1000 },
}));

const mediaStorageService = require('./mediaStorageService');

describe('mediaStorageService', () => {
  it('stores with a generated safe name and cleans the directory', async () => {
    const stored = await mediaStorageService.create(Buffer.from('hello'), '.txt');
    expect(path.basename(stored.filePath)).toBe('attachment.txt');
    await expect(fs.readFile(stored.filePath, 'utf8')).resolves.toBe('hello');
    await stored.cleanup();
    await expect(fs.access(stored.directory)).rejects.toThrow();
  });

  it('purges stale processing directories', async () => {
    const stored = await mediaStorageService.create(Buffer.from('old'), '.txt');
    const oldDate = new Date(Date.now() - 5000);
    await fs.utimes(stored.directory, oldDate, oldDate);
    await expect(mediaStorageService.purgeStale()).resolves.toBeGreaterThanOrEqual(1);
    await expect(fs.access(stored.directory)).rejects.toThrow();
  });
});

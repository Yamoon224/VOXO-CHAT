const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const config = require('../config/config');

const rootDir = path.join(os.tmpdir(), 'voxo-inbound-media');

async function ensureRoot() {
  await fs.mkdir(rootDir, { recursive: true });
}

async function create(buffer, extension) {
  await ensureRoot();
  const directory = await fs.mkdtemp(path.join(rootDir, 'media-'));
  const filePath = path.join(directory, `attachment${extension}`);
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  return {
    directory,
    filePath,
    async cleanup() {
      await fs.rm(directory, { recursive: true, force: true });
    },
  };
}

async function purgeStale(now = Date.now()) {
  await ensureRoot();
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  let removed = 0;
  await Promise.all(entries.map(async (entry) => {
    if (!entry.isDirectory() || !entry.name.startsWith('media-')) return;
    const directory = path.join(rootDir, entry.name);
    const stats = await fs.stat(directory);
    if (now - stats.mtimeMs <= config.media.tempTtlMs) return;
    await fs.rm(directory, { recursive: true, force: true });
    removed += 1;
  }));
  return removed;
}

module.exports = {
  create,
  purgeStale,
  rootDir,
};

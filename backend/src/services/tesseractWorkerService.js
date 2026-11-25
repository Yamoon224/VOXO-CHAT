const path = require('path');
const Tesseract = require('tesseract.js');

const languageDataPath = path.resolve(__dirname, '../..');

function createWorker(languages = 'fra+eng') {
  return Tesseract.createWorker(
    languages,
    Tesseract.OEM.LSTM_ONLY,
    {
      langPath: languageDataPath,
      cachePath: languageDataPath,
      gzip: false,
    }
  );
}

module.exports = {
  createWorker,
  languageDataPath,
};

const { Readable } = require('stream');

jest.mock('axios');
jest.mock('../config/config', () => ({
  media: { maxBytes: 10, downloadTimeoutMs: 1000 },
}));

const axios = require('axios');
const telegramMediaService = require('./telegramMediaService');

function message() {
  return {
    media: {
      reference: 'file-id',
      mimeType: 'image/jpeg',
      fileName: 'photo.jpg',
    },
  };
}

describe('telegramMediaService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves getFile and downloads a bounded stream', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { result: { file_path: 'photos/file.jpg' } } })
      .mockResolvedValueOnce({
        data: Readable.from([Buffer.from([0xFF, 0xD8, 0xFF])]),
        headers: { 'content-length': '3', 'content-type': 'image/jpeg' },
      });

    await expect(telegramMediaService.loadMedia('bot-token', message())).resolves.toMatchObject({
      mimeType: 'image/jpeg',
      fileName: 'photo.jpg',
      sizeBytes: 3,
    });
    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      'https://api.telegram.org/botbot-token/getFile',
      expect.objectContaining({ params: { file_id: 'file-id' } })
    );
  });

  it('rejects oversized and unavailable downloads', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { result: { file_path: 'large.bin' } } })
      .mockResolvedValueOnce({
        data: Readable.from([Buffer.alloc(11)]),
        headers: {},
      });
    await expect(telegramMediaService.loadMedia('token', message()))
      .rejects.toMatchObject({ code: 'MEDIA_TOO_LARGE' });

    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('network'));
    await expect(telegramMediaService.loadMedia('token', message()))
      .rejects.toMatchObject({ code: 'MEDIA_DOWNLOAD_FAILED' });
  });
});

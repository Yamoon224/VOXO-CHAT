jest.mock('fs', () => ({
  createReadStream: jest.fn(() => ({ stream: true })),
}));
jest.mock('../config/config', () => ({
  openai: {
    directApiKey: null,
    transcriptionModel: 'gpt-4o-transcribe',
  },
}));

const { AudioTranscriptionService } = require('./audioTranscriptionService');

describe('audioTranscriptionService', () => {
  it('transcribes an audio file with the configured model', async () => {
    const create = jest.fn().mockResolvedValue({ text: 'Bonjour depuis le vocal' });
    const service = new AudioTranscriptionService({
      audio: { transcriptions: { create } },
    });
    await expect(service.transcribe('voice.ogg')).resolves.toMatchObject({
      content: 'Bonjour depuis le vocal',
      metadata: {
        extractionMethod: 'openai-transcription',
        model: 'gpt-4o-transcribe',
      },
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4o-transcribe',
      response_format: 'json',
    }));
  });

  it('returns an operational French error when unconfigured', async () => {
    const service = new AudioTranscriptionService();
    await expect(service.transcribe('voice.ogg')).rejects.toMatchObject({
      code: 'TRANSCRIPTION_UNAVAILABLE',
      isOperational: true,
    });
  });

  it('uses the OpenRouter Whisper model and exposes its usage metadata', async () => {
    const create = jest.fn().mockResolvedValue({
      text: 'Bonjour depuis OpenRouter',
      usage: { seconds: 3, cost: 0.0001, total_tokens: 42 },
    });
    const service = new AudioTranscriptionService(
      { audio: { transcriptions: { create } } },
      {
        transcriptionProvider: 'openrouter',
        openRouterTranscriptionModel: 'openai/whisper-1',
      }
    );

    await expect(service.transcribe('voice.ogg')).resolves.toMatchObject({
      content: 'Bonjour depuis OpenRouter',
      metadata: {
        extractionMethod: 'openrouter-transcription',
        provider: 'openrouter',
        model: 'openai/whisper-1',
        transcription: { audioSeconds: 3, costUsd: 0.0001, totalTokens: 42 },
      },
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'openai/whisper-1',
      response_format: 'json',
    }));
  });
});

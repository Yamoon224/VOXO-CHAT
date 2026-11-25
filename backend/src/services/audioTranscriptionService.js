const fs = require('fs');
const OpenAI = require('openai');
const config = require('../config/config');
const { AppError } = require('../middleware/errorMiddleware');
const extractedTextService = require('./extractedTextService');

class AudioTranscriptionService {
  constructor(client = null, options = config.openai) {
    this.options = options;
    this.provider = options.transcriptionProvider || 'openai';
    this.model = this.provider === 'openrouter'
      ? options.openRouterTranscriptionModel
      : options.transcriptionModel;
    this.client = client || this.createClient();
  }

  createClient() {
    if (this.provider === 'openrouter' && this.options.apiKey) {
      return new OpenAI({
        apiKey: this.options.apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
    }
    if (this.provider === 'openai' && this.options.directApiKey) {
      return new OpenAI({ apiKey: this.options.directApiKey });
    }
    return null;
  }

  buildMetadata(result, startedAt) {
    const usage = result.usage || {};
    return {
      extractionMethod: `${this.provider}-transcription`,
      provider: this.provider,
      model: this.model,
      transcription: {
        latencyMs: Date.now() - startedAt,
        ...(Number.isFinite(usage.seconds) ? { audioSeconds: usage.seconds } : {}),
        ...(Number.isFinite(usage.cost) ? { costUsd: usage.cost } : {}),
        ...(Number.isFinite(usage.total_tokens) ? { totalTokens: usage.total_tokens } : {}),
      },
    };
  }

  async transcribe(filePath) {
    if (!this.client) {
      throw new AppError('La transcription vocale n’est pas configurée', 503, {
        code: 'TRANSCRIPTION_UNAVAILABLE',
      });
    }
    const startedAt = Date.now();
    try {
      const result = await this.client.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: this.model,
        response_format: 'json',
      });
      return {
        success: true,
        content: extractedTextService.requireMeaningful(result.text, 2),
        metadata: this.buildMetadata(result, startedAt),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Impossible de transcrire le message vocal', 502, {
        code: 'TRANSCRIPTION_FAILED',
      });
    }
  }
}

const service = new AudioTranscriptionService();
module.exports = service;
module.exports.AudioTranscriptionService = AudioTranscriptionService;

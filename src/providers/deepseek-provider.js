/**
 * DeepSeek provider implementation
 * Supports DeepSeek V3.2 Exp and other DeepSeek models
 * Uses OpenAI-compatible API
 */

const OpenAICompatibleProvider = require('./openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.deepseek,
      providerName: 'DeepSeek'
    });
  }
}

module.exports = DeepSeekProvider;

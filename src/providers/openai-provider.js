/**
 * OpenAI provider implementation
 * Supports GPT-4, GPT-3.5, and other OpenAI models
 */

const OpenAICompatibleProvider = require('./openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.openai,
      providerName: 'OpenAI'
    });
  }
}

module.exports = OpenAIProvider;

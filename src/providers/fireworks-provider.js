/**
 * Fireworks AI provider implementation
 * Uses OpenAI-compatible API
 */

const OpenAICompatibleProvider = require('./openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class FireworksProvider extends OpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.fireworks,
      providerName: 'Fireworks AI'
    });
  }
}

module.exports = FireworksProvider;

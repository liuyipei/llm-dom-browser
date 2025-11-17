/**
 * Kimi (Moonshot AI) provider implementation
 * Supports Kimi K2 Thinking and other Moonshot models
 * Uses OpenAI-compatible API
 */

const OpenAICompatibleProvider = require('./openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class KimiProvider extends OpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.kimi,
      providerName: 'Kimi'
    });
  }
}

module.exports = KimiProvider;

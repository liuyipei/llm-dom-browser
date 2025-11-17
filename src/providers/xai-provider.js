/**
 * xAI provider implementation (Grok models)
 * Uses OpenAI-compatible API
 */

const OpenAICompatibleProvider = require('./openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class XAIProvider extends OpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.xai,
      providerName: 'xAI'
    });
  }
}

module.exports = XAIProvider;

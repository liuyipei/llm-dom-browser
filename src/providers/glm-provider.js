/**
 * GLM (Zhipu AI) provider implementation
 * Supports GLM-4.6 and other Zhipu AI models
 * Uses OpenAI-compatible API format
 */

const OpenAICompatibleProvider = require('./openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class GLMProvider extends OpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.glm,
      providerName: 'GLM'
    });
  }
}

module.exports = GLMProvider;

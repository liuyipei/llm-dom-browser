/**
 * LM Studio provider implementation
 * LM Studio is OpenAI API-compatible, so we extend LocalOpenAICompatibleProvider
 * Supports locally hosted LM Studio models via http://localhost:1234
 * Documentation: https://lmstudio.ai/docs/local-server
 */

const LocalOpenAICompatibleProvider = require('./local-openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class LMStudioProvider extends LocalOpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.lmstudio || 'http://localhost:1234/v1',
      // API key is optional for local LM Studio
      apiKey: config.apiKey || 'lm-studio',
      requiresApiKey: false
    });
  }

  /**
   * Get information about loaded models
   * @returns {Promise<Array>} - Array of loaded model info
   */
  async getLoadedModels() {
    try {
      const models = await this.listModels();
      return models.filter(model => {
        // LM Studio marks loaded models
        return model.id && !model.id.includes('placeholder');
      });
    } catch (error) {
      console.error('Error getting LM Studio loaded models:', error);
      return [];
    }
  }
}

module.exports = LMStudioProvider;

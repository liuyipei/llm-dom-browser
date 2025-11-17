/**
 * vLLM provider implementation
 * vLLM is OpenAI API-compatible, so we extend LocalOpenAICompatibleProvider
 * Supports locally hosted vLLM models via http://localhost:8000
 * Documentation: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
 */

const LocalOpenAICompatibleProvider = require('./local-openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class VLLMProvider extends LocalOpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.vllm || 'http://localhost:8000/v1',
      // API key is optional for local vLLM
      apiKey: config.apiKey || 'dummy-key-for-local',
      requiresApiKey: false
    });
  }

  /**
   * Get model information
   * @returns {Promise<Object>} - Model info
   */
  async getModelInfo() {
    try {
      const models = await this.listModels();
      if (models.length > 0) {
        return models[0]; // vLLM typically serves one model at a time
      }
      return null;
    } catch (error) {
      console.error('Error getting vLLM model info:', error);
      return null;
    }
  }
}

module.exports = VLLMProvider;

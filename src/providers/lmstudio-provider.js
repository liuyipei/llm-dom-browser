/**
 * LM Studio provider implementation
 * LM Studio is OpenAI API-compatible, so we extend OpenAIProvider
 * Supports locally hosted LM Studio models via http://localhost:1234
 * Documentation: https://lmstudio.ai/docs/local-server
 */

const OpenAIProvider = require('./openai-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class LMStudioProvider extends OpenAIProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.lmstudio || 'http://localhost:1234/v1',
      // API key is optional for local LM Studio
      apiKey: config.apiKey || 'lm-studio'
    });
  }

  /**
   * List available models from LM Studio instance
   * @returns {Promise<Array>} - Array of model objects
   */
  async listModels() {
    const url = `${this.baseUrl}/models`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list LM Studio models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error listing LM Studio models:', error);
      throw error;
    }
  }

  /**
   * Check if LM Studio service is running and accessible
   * @returns {Promise<boolean>} - True if service is running
   */
  async healthCheck() {
    try {
      const url = `${this.baseUrl}/models`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
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

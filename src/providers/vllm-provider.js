/**
 * vLLM provider implementation
 * vLLM is OpenAI API-compatible, so we extend OpenAIProvider
 * Supports locally hosted vLLM models via http://localhost:8000
 * Documentation: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
 */

const OpenAIProvider = require('./openai-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class VLLMProvider extends OpenAIProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.vllm || 'http://localhost:8000/v1',
      // API key is optional for local vLLM
      apiKey: config.apiKey || 'dummy-key-for-local'
    });
  }

  /**
   * List available models from vLLM instance
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
        throw new Error(`Failed to list vLLM models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error listing vLLM models:', error);
      throw error;
    }
  }

  /**
   * Check if vLLM service is running and accessible
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

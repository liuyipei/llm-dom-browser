/**
 * Base class for local OpenAI-compatible providers (vLLM, LM Studio)
 * Extends OpenAI provider functionality with local provider utilities
 */

const OpenAIProvider = require('./openai-provider');

class LocalOpenAICompatibleProvider extends OpenAIProvider {
  constructor(config = {}) {
    super(config);
    // API key is optional for local providers
    this.requiresApiKey = config.requiresApiKey !== undefined ? config.requiresApiKey : false;
  }

  /**
   * Check if the local service is running and accessible
   * @returns {Promise<boolean>} - True if service is running
   */
  async healthCheck() {
    try {
      const url = `${this.baseUrl}/models`;
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add authorization header if API key is present
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available models from local instance
   * @returns {Promise<Array>} - Array of model objects
   */
  async listModels() {
    const url = `${this.baseUrl}/models`;
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authorization header if API key is present
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`Error listing models from ${this.constructor.name}:`, error);
      throw error;
    }
  }
}

module.exports = LocalOpenAICompatibleProvider;

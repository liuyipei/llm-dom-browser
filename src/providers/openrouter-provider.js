/**
 * OpenRouter provider implementation
 * Aggregates access to multiple LLM providers through a single API
 * Uses OpenAI-compatible API
 */

const OpenAICompatibleProvider = require('./openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.openrouter,
      providerName: 'OpenRouter'
    });
  }

  /**
   * Override to add OpenRouter-specific headers
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://github.com/liuyipei/llm-dom-browser',
      'X-Title': 'LLM-DOM-Browser'
    };
  }
}

module.exports = OpenRouterProvider;

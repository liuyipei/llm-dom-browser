/**
 * OpenRouter provider implementation
 * Aggregates access to multiple LLM providers through a single API
 * Uses OpenAI-compatible API
 */

const BaseProvider = require('./base-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class OpenRouterProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.openrouter
    });
    this.validateConfig(['apiKey', 'model']);
  }

  /**
   * Generate a completion using OpenRouter's API (OpenAI-compatible)
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {Promise<string>} - The generated response
   */
  async generateCompletion(prompt, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: false
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/liuyipei/llm-dom-browser',
        'X-Title': 'LLM-DOM-Browser'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`OpenRouter API error: ${errorMessage}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Generate a streaming completion
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {AsyncGenerator<string>} - Stream of text chunks
   */
  async *generateStreamingCompletion(prompt, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: true
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/liuyipei/llm-dom-browser',
        'X-Title': 'LLM-DOM-Browser'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`OpenRouter API error: ${errorMessage}`);
    }

    for await (const chunk of this.streamResponse(response)) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

module.exports = OpenRouterProvider;

/**
 * OpenAI provider implementation
 * Supports GPT-4, GPT-3.5, and other OpenAI models
 */

const BaseProvider = require('./base-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.openai
    });
    this.validateConfig(['apiKey', 'model']);
  }

  /**
   * Generate a completion using OpenAI's API
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
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`OpenAI API error: ${errorMessage}`);
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
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    for await (const chunk of this.streamResponse(response)) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

module.exports = OpenAIProvider;

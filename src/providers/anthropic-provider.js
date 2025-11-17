/**
 * Anthropic provider implementation
 * Supports Claude 3.5 Sonnet, Claude 3 Opus, and other Anthropic models
 */

const BaseProvider = require('./base-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.anthropic
    });
    this.validateConfig(['apiKey', 'model']);
    this.anthropicVersion = '2023-06-01';
  }

  /**
   * Generate a completion using Anthropic's API
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {Promise<Object>} - The generated response with metadata
   */
  async generateCompletion(prompt, options = {}) {
    const url = `${this.baseUrl}/messages`;

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      stream: false
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.anthropicVersion
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }

    const data = await response.json();

    // Return full metadata
    return {
      text: data.content[0]?.text || '',
      usage: data.usage || {},
      model: data.model,
      stopReason: data.stop_reason
    };
  }

  /**
   * Generate a streaming completion
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {AsyncGenerator<string>} - Stream of text chunks
   */
  async *generateStreamingCompletion(prompt, options = {}) {
    const url = `${this.baseUrl}/messages`;

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      stream: true
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.anthropicVersion
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }

    for await (const chunk of this.streamResponse(response)) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}

module.exports = AnthropicProvider;

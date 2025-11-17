/**
 * OpenAI-compatible provider base class
 * Provides common implementation for providers that follow OpenAI's API format
 * Supports: OpenAI, DeepSeek, Fireworks, XAI, GLM, Kimi, OpenRouter, MiniMax
 */

const BaseProvider = require('./base-provider');

class OpenAICompatibleProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.providerName = config.providerName || 'OpenAI-compatible';
    this.validateConfig(['apiKey', 'model']);
  }

  /**
   * Get request headers (can be overridden by subclasses for custom headers)
   * @returns {Object} - The headers object
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  /**
   * Generate a completion using OpenAI-compatible API
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {Promise<Object>} - The generated response with metadata
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
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`${this.providerName} API error: ${errorMessage}`);
    }

    const data = await response.json();

    // Return full metadata
    return {
      text: data.choices[0]?.message?.content || '',
      usage: data.usage || {},
      model: data.model,
      finishReason: data.choices[0]?.finish_reason
    };
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
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`${this.providerName} API error: ${errorMessage}`);
    }

    for await (const chunk of this.streamResponse(response)) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

module.exports = OpenAICompatibleProvider;

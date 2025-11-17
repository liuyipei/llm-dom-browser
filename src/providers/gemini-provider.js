/**
 * Google Gemini provider implementation
 * Supports Gemini 2.0 Flash, Gemini 1.5 Pro, and other Google models
 */

const BaseProvider = require('./base-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.google
    });
    this.validateConfig(['apiKey', 'model']);
  }

  /**
   * Generate a completion using Google's Gemini API
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {Promise<string>} - The generated response
   */
  async generateCompletion(prompt, options = {}) {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2000
      }
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Generate a streaming completion
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {AsyncGenerator<string>} - Stream of text chunks
   */
  async *generateStreamingCompletion(prompt, options = {}) {
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2000
      }
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    for await (const chunk of this.streamResponse(response)) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        yield text;
      }
    }
  }
}

module.exports = GeminiProvider;

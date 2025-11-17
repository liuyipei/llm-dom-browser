/**
 * MiniMax provider implementation
 * Supports MiniMax M2 and other MiniMax models
 * Uses OpenAI-compatible API (also supports Anthropic format)
 */

const OpenAICompatibleProvider = require('./openai-compatible-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class MiniMaxProvider extends OpenAICompatibleProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.minimax,
      providerName: 'MiniMax'
    });
  }

  /**
   * Override to handle both OpenAI and Anthropic response formats
   */
  async generateCompletion(prompt, options = {}) {
    const result = await super.generateCompletion(prompt, options);
    // MiniMax may return Anthropic-style response, handle both formats
    if (typeof result === 'object' && result.text) {
      return result;
    }
    // If the text field is empty, try Anthropic format
    if (!result.text) {
      const url = `${this.baseUrl}/chat/completions`;
      const requestBody = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: false
      };
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });
      if (response.ok) {
        const data = await response.json();
        const anthropicText = data.content?.[0]?.text;
        if (anthropicText) {
          return { text: anthropicText, usage: {}, model: this.model };
        }
      }
    }
    return result;
  }
}

module.exports = MiniMaxProvider;

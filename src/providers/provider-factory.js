/**
 * Factory for creating LLM provider instances
 * Simplifies provider instantiation and configuration
 */

const { PROVIDERS, DEFAULT_MODELS } = require('./models');
const OpenAIProvider = require('./openai-provider');
const AnthropicProvider = require('./anthropic-provider');
const GeminiProvider = require('./gemini-provider');
const XAIProvider = require('./xai-provider');
const FireworksProvider = require('./fireworks-provider');
const OpenRouterProvider = require('./openrouter-provider');

class ProviderFactory {
  /**
   * Create a provider instance based on the provider name
   * @param {string} providerName - Name of the provider (e.g., 'openai', 'anthropic')
   * @param {Object} config - Configuration object with apiKey, model, etc.
   * @returns {BaseProvider} - Provider instance
   */
  static createProvider(providerName, config = {}) {
    // Set default model if not provided
    if (!config.model && DEFAULT_MODELS[providerName]) {
      config.model = DEFAULT_MODELS[providerName];
    }

    switch (providerName.toLowerCase()) {
      case PROVIDERS.OPENAI:
        return new OpenAIProvider(config);

      case PROVIDERS.ANTHROPIC:
        return new AnthropicProvider(config);

      case PROVIDERS.GOOGLE:
        return new GeminiProvider(config);

      case PROVIDERS.XAI:
        return new XAIProvider(config);

      case PROVIDERS.OPENROUTER:
        return new OpenRouterProvider(config);

      case PROVIDERS.FIREWORKS:
        return new FireworksProvider(config);

      default:
        throw new Error(`Unknown provider: ${providerName}. Supported providers: ${Object.values(PROVIDERS).join(', ')}`);
    }
  }

  /**
   * Get a list of all supported providers
   * @returns {Array<string>} - List of provider names
   */
  static getSupportedProviders() {
    return Object.values(PROVIDERS);
  }

  /**
   * Check if a provider is supported
   * @param {string} providerName - Name of the provider
   * @returns {boolean} - True if supported
   */
  static isProviderSupported(providerName) {
    return Object.values(PROVIDERS).includes(providerName.toLowerCase());
  }
}

module.exports = ProviderFactory;

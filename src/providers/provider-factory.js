/**
 * Factory for creating LLM provider instances
 * Simplified with configuration-driven approach
 * Updated: November 2025 - Reduced boilerplate
 */

const { PROVIDERS, DEFAULT_MODELS } = require('./models');
const { OPENAI_COMPATIBLE_CONFIGS } = require('./provider-config');

// Base providers
const OpenAICompatibleProvider = require('./openai-compatible-provider');

// Custom providers (with specialized implementations)
const AnthropicProvider = require('./anthropic-provider');
const GeminiProvider = require('./gemini-provider');
const OpenRouterProvider = require('./openrouter-provider');
const MiniMaxProvider = require('./minimax-provider');
const OllamaProvider = require('./ollama-provider');
const VLLMProvider = require('./vllm-provider');
const LMStudioProvider = require('./lmstudio-provider');

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

    const provider = providerName.toLowerCase();

    // Check if it's a simple OpenAI-compatible provider (config-driven)
    if (OPENAI_COMPATIBLE_CONFIGS[provider]) {
      const providerConfig = OPENAI_COMPATIBLE_CONFIGS[provider];
      return new OpenAICompatibleProvider({
        ...config,
        baseUrl: config.baseUrl || providerConfig.baseUrl,
        providerName: providerConfig.providerName
      });
    }

    // Handle custom providers with specialized implementations
    switch (provider) {
      case PROVIDERS.ANTHROPIC:
        return new AnthropicProvider(config);

      case PROVIDERS.GOOGLE:
        return new GeminiProvider(config);

      case PROVIDERS.OPENROUTER:
        return new OpenRouterProvider(config);

      case PROVIDERS.MINIMAX:
        return new MiniMaxProvider(config);

      case PROVIDERS.OLLAMA:
        return new OllamaProvider(config);

      case PROVIDERS.VLLM:
        return new VLLMProvider(config);

      case PROVIDERS.LMSTUDIO:
        return new LMStudioProvider(config);

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

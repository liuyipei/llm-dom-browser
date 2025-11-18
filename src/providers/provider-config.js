/**
 * Provider configuration
 * Centralized configuration for OpenAI-compatible providers
 * Eliminates need for boilerplate provider classes
 */

const { PROVIDERS, PROVIDER_ENDPOINTS } = require('./models');

/**
 * Configuration for providers that use OpenAI-compatible API
 * Simple providers just need baseUrl and providerName
 */
const OPENAI_COMPATIBLE_CONFIGS = {
  [PROVIDERS.OPENAI]: {
    baseUrl: PROVIDER_ENDPOINTS[PROVIDERS.OPENAI],
    providerName: 'OpenAI'
  },
  [PROVIDERS.FIREWORKS]: {
    baseUrl: PROVIDER_ENDPOINTS[PROVIDERS.FIREWORKS],
    providerName: 'Fireworks AI'
  },
  [PROVIDERS.DEEPSEEK]: {
    baseUrl: PROVIDER_ENDPOINTS[PROVIDERS.DEEPSEEK],
    providerName: 'DeepSeek'
  },
  [PROVIDERS.XAI]: {
    baseUrl: PROVIDER_ENDPOINTS[PROVIDERS.XAI],
    providerName: 'xAI'
  },
  [PROVIDERS.KIMI]: {
    baseUrl: PROVIDER_ENDPOINTS[PROVIDERS.KIMI],
    providerName: 'Kimi'
  },
  [PROVIDERS.GLM]: {
    baseUrl: PROVIDER_ENDPOINTS[PROVIDERS.GLM],
    providerName: 'GLM'
  }
};

/**
 * Providers with custom implementations (not simple config-based)
 */
const CUSTOM_PROVIDER_CLASSES = [
  PROVIDERS.ANTHROPIC,    // Custom message format
  PROVIDERS.GOOGLE,       // Gemini-specific API
  PROVIDERS.OPENROUTER,   // Custom headers
  PROVIDERS.MINIMAX,      // Dual format support
  PROVIDERS.OLLAMA,       // Local provider with model management
  PROVIDERS.VLLM,         // Local OpenAI-compatible
  PROVIDERS.LMSTUDIO      // Local OpenAI-compatible
];

module.exports = {
  OPENAI_COMPATIBLE_CONFIGS,
  CUSTOM_PROVIDER_CLASSES
};

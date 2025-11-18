/**
 * Centralized configuration for the LLM-DOM Browser
 * Imports provider data from the models module to maintain single source of truth
 */

const {
  PROVIDERS,
  PROVIDER_ENDPOINTS,
  OPTIONAL_API_KEY_PROVIDERS,
  CUSTOM_ENDPOINT_PROVIDERS,
  DEFAULT_MODELS,
  MODELS
} = require('../providers/models');

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: 'llm-dom-browser-settings',
  BOOKMARKS: 'llm-dom-browser-bookmarks',
  TAB_MANAGEMENT: 'tab-management'
};

// Provider display names (for UI generation)
const PROVIDER_LABELS = {
  [PROVIDERS.OPENAI]: 'OpenAI (GPT-5.1)',
  [PROVIDERS.ANTHROPIC]: 'Anthropic (Claude 4.5)',
  [PROVIDERS.GOOGLE]: 'Google (Gemini 2.5 Pro)',
  [PROVIDERS.XAI]: 'xAI (Grok 4)',
  [PROVIDERS.DEEPSEEK]: 'DeepSeek (V3.2 Exp)',
  [PROVIDERS.KIMI]: 'Kimi (K2 Thinking)',
  [PROVIDERS.MINIMAX]: 'MiniMax (M2)',
  [PROVIDERS.GLM]: 'GLM (4.6)',
  [PROVIDERS.OPENROUTER]: 'OpenRouter',
  [PROVIDERS.FIREWORKS]: 'Fireworks AI',
  [PROVIDERS.OLLAMA]: 'Ollama (Local)',
  [PROVIDERS.VLLM]: 'vLLM (Local)',
  [PROVIDERS.LMSTUDIO]: 'LM Studio (Local)'
};

// Provider groups for UI organization
const PROVIDER_GROUPS = {
  cloud: [
    PROVIDERS.OPENAI,
    PROVIDERS.ANTHROPIC,
    PROVIDERS.GOOGLE,
    PROVIDERS.XAI,
    PROVIDERS.DEEPSEEK,
    PROVIDERS.KIMI,
    PROVIDERS.MINIMAX,
    PROVIDERS.GLM,
    PROVIDERS.OPENROUTER,
    PROVIDERS.FIREWORKS
  ],
  local: [
    PROVIDERS.OLLAMA,
    PROVIDERS.VLLM,
    PROVIDERS.LMSTUDIO
  ]
};

module.exports = {
  STORAGE_KEYS,
  PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_GROUPS,
  PROVIDER_ENDPOINTS,
  OPTIONAL_API_KEY_PROVIDERS,
  CUSTOM_ENDPOINT_PROVIDERS,
  DEFAULT_MODELS,
  MODELS
};

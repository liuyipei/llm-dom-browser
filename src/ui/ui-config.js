/**
 * UI Configuration (Browser-compatible)
 * IMPORTANT: This file must stay in sync with ../providers/models.js
 *
 * WARNING: Single Source of Truth Violation
 * TODO: Refactor to fetch this configuration via IPC from main process
 * to eliminate duplication. For now, manually ensure changes to models.js
 * are reflected here.
 */

// Provider constants - MUST match PROVIDERS in models.js
const PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  XAI: 'xai',
  OPENROUTER: 'openrouter',
  FIREWORKS: 'fireworks',
  DEEPSEEK: 'deepseek',
  KIMI: 'kimi',
  MINIMAX: 'minimax',
  GLM: 'glm',
  OLLAMA: 'ollama',
  VLLM: 'vllm',
  LMSTUDIO: 'lmstudio'
};

// Local providers that don't require API keys
// MUST match OPTIONAL_API_KEY_PROVIDERS in models.js
const LOCAL_PROVIDERS = [
  PROVIDERS.OLLAMA,
  PROVIDERS.VLLM,
  PROVIDERS.LMSTUDIO
];

// Default endpoints for local providers
// MUST match PROVIDER_ENDPOINTS in models.js for these providers
const DEFAULT_ENDPOINTS = {
  [PROVIDERS.OLLAMA]: 'http://localhost:11434',
  [PROVIDERS.VLLM]: 'http://localhost:8000/v1',
  [PROVIDERS.LMSTUDIO]: 'http://localhost:1234/v1'
};

// Provider display labels
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
    PROVIDERS.FIREWORKS,
    PROVIDERS.OPENROUTER,
    PROVIDERS.ANTHROPIC,
    PROVIDERS.OPENAI,
    PROVIDERS.GOOGLE,
    PROVIDERS.XAI,
    PROVIDERS.DEEPSEEK,
    PROVIDERS.KIMI,
    PROVIDERS.MINIMAX,
    PROVIDERS.GLM
  ],
  local: [
    PROVIDERS.OLLAMA,
    PROVIDERS.VLLM,
    PROVIDERS.LMSTUDIO
  ]
};

// Make available globally for browser
if (typeof window !== 'undefined') {
  window.AppConfig = {
    PROVIDERS,
    LOCAL_PROVIDERS,
    DEFAULT_ENDPOINTS,
    PROVIDER_LABELS,
    PROVIDER_GROUPS
  };
}

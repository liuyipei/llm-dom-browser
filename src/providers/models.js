/**
 * Model definitions and metadata for all supported providers
 */

const PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  XAI: 'xai',
  OPENROUTER: 'openrouter',
  FIREWORKS: 'fireworks'
};

const MODELS = {
  // OpenAI Models
  [PROVIDERS.OPENAI]: {
    'gpt-4o': {
      name: 'GPT-4o',
      maxTokens: 16384,
      contextWindow: 128000
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      maxTokens: 16384,
      contextWindow: 128000
    },
    'gpt-4-turbo': {
      name: 'GPT-4 Turbo',
      maxTokens: 4096,
      contextWindow: 128000
    },
    'gpt-3.5-turbo': {
      name: 'GPT-3.5 Turbo',
      maxTokens: 4096,
      contextWindow: 16385
    },
    'o1': {
      name: 'O1',
      maxTokens: 100000,
      contextWindow: 200000
    },
    'o1-mini': {
      name: 'O1 Mini',
      maxTokens: 65536,
      contextWindow: 128000
    }
  },

  // Anthropic Models
  [PROVIDERS.ANTHROPIC]: {
    'claude-3-5-sonnet-20241022': {
      name: 'Claude 3.5 Sonnet',
      maxTokens: 8192,
      contextWindow: 200000
    },
    'claude-3-5-haiku-20241022': {
      name: 'Claude 3.5 Haiku',
      maxTokens: 8192,
      contextWindow: 200000
    },
    'claude-3-opus-20240229': {
      name: 'Claude 3 Opus',
      maxTokens: 4096,
      contextWindow: 200000
    },
    'claude-3-sonnet-20240229': {
      name: 'Claude 3 Sonnet',
      maxTokens: 4096,
      contextWindow: 200000
    },
    'claude-3-haiku-20240307': {
      name: 'Claude 3 Haiku',
      maxTokens: 4096,
      contextWindow: 200000
    }
  },

  // Google Gemini Models
  [PROVIDERS.GOOGLE]: {
    'gemini-2.0-flash-exp': {
      name: 'Gemini 2.0 Flash',
      maxTokens: 8192,
      contextWindow: 1000000
    },
    'gemini-1.5-pro': {
      name: 'Gemini 1.5 Pro',
      maxTokens: 8192,
      contextWindow: 2000000
    },
    'gemini-1.5-flash': {
      name: 'Gemini 1.5 Flash',
      maxTokens: 8192,
      contextWindow: 1000000
    }
  },

  // xAI Models
  [PROVIDERS.XAI]: {
    'grok-2-1212': {
      name: 'Grok 2',
      maxTokens: 32768,
      contextWindow: 131072
    },
    'grok-2-vision-1212': {
      name: 'Grok 2 Vision',
      maxTokens: 32768,
      contextWindow: 32768
    },
    'grok-beta': {
      name: 'Grok Beta',
      maxTokens: 16384,
      contextWindow: 131072
    }
  },

  // OpenRouter (aggregates multiple providers)
  [PROVIDERS.OPENROUTER]: {
    'anthropic/claude-3.5-sonnet': {
      name: 'Claude 3.5 Sonnet (via OpenRouter)',
      maxTokens: 8192,
      contextWindow: 200000
    },
    'openai/gpt-4o': {
      name: 'GPT-4o (via OpenRouter)',
      maxTokens: 16384,
      contextWindow: 128000
    },
    'google/gemini-2.0-flash-exp': {
      name: 'Gemini 2.0 Flash (via OpenRouter)',
      maxTokens: 8192,
      contextWindow: 1000000
    },
    'x-ai/grok-2-1212': {
      name: 'Grok 2 (via OpenRouter)',
      maxTokens: 32768,
      contextWindow: 131072
    }
  },

  // Fireworks AI Models
  [PROVIDERS.FIREWORKS]: {
    'accounts/fireworks/models/llama-v3p3-70b-instruct': {
      name: 'Llama 3.3 70B',
      maxTokens: 16384,
      contextWindow: 131072
    },
    'accounts/fireworks/models/llama-v3p1-405b-instruct': {
      name: 'Llama 3.1 405B',
      maxTokens: 16384,
      contextWindow: 131072
    },
    'accounts/fireworks/models/qwen2p5-72b-instruct': {
      name: 'Qwen 2.5 72B',
      maxTokens: 8192,
      contextWindow: 131072
    }
  }
};

// Default models for each provider
const DEFAULT_MODELS = {
  [PROVIDERS.OPENAI]: 'gpt-4o',
  [PROVIDERS.ANTHROPIC]: 'claude-3-5-sonnet-20241022',
  [PROVIDERS.GOOGLE]: 'gemini-2.0-flash-exp',
  [PROVIDERS.XAI]: 'grok-2-1212',
  [PROVIDERS.OPENROUTER]: 'anthropic/claude-3.5-sonnet',
  [PROVIDERS.FIREWORKS]: 'accounts/fireworks/models/llama-v3p3-70b-instruct'
};

// Provider API endpoints
const PROVIDER_ENDPOINTS = {
  [PROVIDERS.OPENAI]: 'https://api.openai.com/v1',
  [PROVIDERS.ANTHROPIC]: 'https://api.anthropic.com/v1',
  [PROVIDERS.GOOGLE]: 'https://generativelanguage.googleapis.com/v1beta',
  [PROVIDERS.XAI]: 'https://api.x.ai/v1',
  [PROVIDERS.OPENROUTER]: 'https://openrouter.ai/api/v1',
  [PROVIDERS.FIREWORKS]: 'https://api.fireworks.ai/inference/v1'
};

module.exports = {
  PROVIDERS,
  MODELS,
  DEFAULT_MODELS,
  PROVIDER_ENDPOINTS
};

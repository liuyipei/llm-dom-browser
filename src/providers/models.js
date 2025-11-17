/**
 * Model definitions and metadata for all supported providers
 * Updated: November 2025 with latest models
 */

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

const MODELS = {
  // OpenAI Models (Updated Nov 2025)
  [PROVIDERS.OPENAI]: {
    'gpt-5.1': {
      name: 'GPT-5.1 Instant',
      maxTokens: 16384,
      contextWindow: 200000,
      released: '2025-11-12',
      description: 'Latest GPT-5.1 with adaptive reasoning'
    },
    'gpt-5.1-thinking': {
      name: 'GPT-5.1 Thinking',
      maxTokens: 32768,
      contextWindow: 200000,
      released: '2025-11-12',
      description: 'Advanced reasoning model, faster and more persistent'
    },
    'gpt-5': {
      name: 'GPT-5',
      maxTokens: 16384,
      contextWindow: 200000,
      released: '2025-08-07',
      description: 'Original GPT-5 release'
    },
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
    'o1': {
      name: 'O1',
      maxTokens: 100000,
      contextWindow: 200000
    }
  },

  // Anthropic Models (Updated Nov 2025)
  [PROVIDERS.ANTHROPIC]: {
    'claude-sonnet-4-5-20250929': {
      name: 'Claude Sonnet 4.5',
      maxTokens: 8192,
      contextWindow: 200000,
      released: '2025-09-29',
      description: 'Best coding model in the world, state-of-the-art on SWE-bench'
    },
    'claude-haiku-4-5-20251022': {
      name: 'Claude Haiku 4.5',
      maxTokens: 8192,
      contextWindow: 200000,
      released: '2025-10-15',
      description: 'Fast, cost-efficient model'
    },
    'claude-opus-4-1-20250805': {
      name: 'Claude Opus 4.1',
      maxTokens: 8192,
      contextWindow: 200000,
      released: '2025-08-05',
      description: 'Upgrade focused on agentic tasks and reasoning'
    },
    'claude-3-5-sonnet-20241022': {
      name: 'Claude 3.5 Sonnet',
      maxTokens: 8192,
      contextWindow: 200000
    },
    'claude-3-5-haiku-20241022': {
      name: 'Claude 3.5 Haiku',
      maxTokens: 8192,
      contextWindow: 200000
    }
  },

  // Google Gemini Models (Updated Nov 2025)
  [PROVIDERS.GOOGLE]: {
    'gemini-2.5-pro': {
      name: 'Gemini 2.5 Pro',
      maxTokens: 8192,
      contextWindow: 1000000,
      released: '2025-06',
      description: 'Most advanced Gemini model with adaptive thinking'
    },
    'gemini-2.5-flash': {
      name: 'Gemini 2.5 Flash',
      maxTokens: 8192,
      contextWindow: 1000000,
      released: '2025-06',
      description: 'Fast, optimized for speed and performance'
    },
    'gemini-2.5-flash-lite': {
      name: 'Gemini 2.5 Flash-Lite',
      maxTokens: 8192,
      contextWindow: 1000000,
      released: '2025-06',
      description: 'Most cost-efficient and fastest 2.5 model'
    },
    'gemini-2.0-flash-exp': {
      name: 'Gemini 2.0 Flash',
      maxTokens: 8192,
      contextWindow: 1000000
    }
  },

  // xAI Models (Updated Nov 2025)
  [PROVIDERS.XAI]: {
    'grok-4': {
      name: 'Grok 4',
      maxTokens: 32768,
      contextWindow: 131072,
      released: '2025-07-09',
      description: 'Most intelligent model with native tool use'
    },
    'grok-4-heavy': {
      name: 'Grok 4 Heavy',
      maxTokens: 32768,
      contextWindow: 131072,
      released: '2025-07-09',
      description: 'Multi-agent collaboration, advanced reasoning'
    },
    'grok-4-fast': {
      name: 'Grok 4 Fast',
      maxTokens: 32768,
      contextWindow: 2000000,
      released: '2025-09',
      description: 'Frontier-level performance, 40% fewer thinking tokens'
    },
    'grok-code-fast-1': {
      name: 'Grok Code Fast 1',
      maxTokens: 32768,
      contextWindow: 131072,
      released: '2025-08-28',
      description: 'Speedy reasoning model for agentic coding'
    },
    'grok-2-1212': {
      name: 'Grok 2',
      maxTokens: 32768,
      contextWindow: 131072
    }
  },

  // DeepSeek Models (Updated Nov 2025)
  [PROVIDERS.DEEPSEEK]: {
    'deepseek-v3.2-exp': {
      name: 'DeepSeek V3.2 Exp',
      maxTokens: 8192,
      contextWindow: 128000,
      released: '2025-09-29',
      description: 'Sparse attention model, 50%+ cheaper API, open source'
    },
    'deepseek-v3.1-terminus': {
      name: 'DeepSeek V3.1 Terminus',
      maxTokens: 8192,
      contextWindow: 128000,
      description: 'Previous stable release'
    },
    'deepseek-chat': {
      name: 'DeepSeek Chat',
      maxTokens: 4096,
      contextWindow: 64000,
      description: 'General purpose chat model'
    }
  },

  // Kimi (Moonshot AI) Models (Updated Nov 2025)
  [PROVIDERS.KIMI]: {
    'kimi-k2-thinking': {
      name: 'Kimi K2 Thinking',
      maxTokens: 8192,
      contextWindow: 256000,
      released: '2025-11-06',
      description: '1T params, 200-300 tool calls, outperforms GPT-5 on benchmarks'
    },
    'kimi-k2': {
      name: 'Kimi K2',
      maxTokens: 8192,
      contextWindow: 256000,
      released: '2025-07',
      description: '32B active, 1T total params MoE model'
    }
  },

  // MiniMax Models (Updated Nov 2025)
  [PROVIDERS.MINIMAX]: {
    'minimax-m2': {
      name: 'MiniMax M2',
      maxTokens: 8192,
      contextWindow: 128000,
      released: '2025-10-27',
      description: '230B params, 10B active, 8% Claude price, 2x faster'
    }
  },

  // GLM (Zhipu AI) Models (Updated Nov 2025)
  [PROVIDERS.GLM]: {
    'glm-4.6': {
      name: 'GLM-4.6',
      maxTokens: 8192,
      contextWindow: 200000,
      released: '2025-09-30',
      description: '355B params MoE, strong coding, MIT license'
    },
    'glm-4.5': {
      name: 'GLM-4.5',
      maxTokens: 8192,
      contextWindow: 128000,
      description: 'Previous generation with strong agentic capabilities'
    }
  },

  // OpenRouter (aggregates multiple providers)
  [PROVIDERS.OPENROUTER]: {
    'anthropic/claude-sonnet-4-5': {
      name: 'Claude Sonnet 4.5 (via OpenRouter)',
      maxTokens: 8192,
      contextWindow: 200000
    },
    'openai/gpt-5.1': {
      name: 'GPT-5.1 (via OpenRouter)',
      maxTokens: 16384,
      contextWindow: 200000
    },
    'google/gemini-2.5-pro': {
      name: 'Gemini 2.5 Pro (via OpenRouter)',
      maxTokens: 8192,
      contextWindow: 1000000
    },
    'x-ai/grok-4': {
      name: 'Grok 4 (via OpenRouter)',
      maxTokens: 32768,
      contextWindow: 131072
    },
    'deepseek/deepseek-v3.2-exp': {
      name: 'DeepSeek V3.2 Exp (via OpenRouter)',
      maxTokens: 8192,
      contextWindow: 128000
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
  },

  // Ollama Models (Locally Hosted)
  [PROVIDERS.OLLAMA]: {
    'llama3.2': {
      name: 'Llama 3.2',
      maxTokens: 4096,
      contextWindow: 131072,
      description: 'Meta\'s Llama 3.2 model'
    },
    'llama3.1': {
      name: 'Llama 3.1',
      maxTokens: 4096,
      contextWindow: 131072,
      description: 'Meta\'s Llama 3.1 model'
    },
    'mistral': {
      name: 'Mistral',
      maxTokens: 4096,
      contextWindow: 32768,
      description: 'Mistral 7B model'
    },
    'mixtral': {
      name: 'Mixtral',
      maxTokens: 4096,
      contextWindow: 32768,
      description: 'Mixtral 8x7B MoE model'
    },
    'qwen2.5': {
      name: 'Qwen 2.5',
      maxTokens: 4096,
      contextWindow: 131072,
      description: 'Alibaba\'s Qwen 2.5 model'
    },
    'codellama': {
      name: 'Code Llama',
      maxTokens: 4096,
      contextWindow: 100000,
      description: 'Meta\'s Code Llama for coding tasks'
    },
    'deepseek-coder': {
      name: 'DeepSeek Coder',
      maxTokens: 4096,
      contextWindow: 16384,
      description: 'DeepSeek specialized coding model'
    },
    'phi3': {
      name: 'Phi-3',
      maxTokens: 4096,
      contextWindow: 128000,
      description: 'Microsoft\'s Phi-3 compact model'
    }
  },

  // vLLM Models (Locally Hosted - OpenAI Compatible)
  [PROVIDERS.VLLM]: {
    // Models are dynamically loaded from the vLLM instance
    // Default placeholder - actual models determined at runtime
  },

  // LM Studio Models (Locally Hosted - OpenAI Compatible)
  [PROVIDERS.LMSTUDIO]: {
    // Models are dynamically loaded from LM Studio
    // Default placeholder - actual models determined at runtime
  }
};

// Default models for each provider (Updated with latest Nov 2025)
const DEFAULT_MODELS = {
  [PROVIDERS.OPENAI]: 'gpt-5.1',
  [PROVIDERS.ANTHROPIC]: 'claude-sonnet-4-5-20250929',
  [PROVIDERS.GOOGLE]: 'gemini-2.5-pro',
  [PROVIDERS.XAI]: 'grok-4',
  [PROVIDERS.DEEPSEEK]: 'deepseek-v3.2-exp',
  [PROVIDERS.KIMI]: 'kimi-k2-thinking',
  [PROVIDERS.MINIMAX]: 'minimax-m2',
  [PROVIDERS.GLM]: 'glm-4.6',
  [PROVIDERS.OPENROUTER]: 'anthropic/claude-sonnet-4-5',
  [PROVIDERS.FIREWORKS]: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
  [PROVIDERS.OLLAMA]: 'llama3.2',
  [PROVIDERS.VLLM]: null, // Dynamically determined
  [PROVIDERS.LMSTUDIO]: null // Dynamically determined
};

// Provider API endpoints
const PROVIDER_ENDPOINTS = {
  [PROVIDERS.OPENAI]: 'https://api.openai.com/v1',
  [PROVIDERS.ANTHROPIC]: 'https://api.anthropic.com/v1',
  [PROVIDERS.GOOGLE]: 'https://generativelanguage.googleapis.com/v1beta',
  [PROVIDERS.XAI]: 'https://api.x.ai/v1',
  [PROVIDERS.DEEPSEEK]: 'https://api.deepseek.com',
  [PROVIDERS.KIMI]: 'https://api.moonshot.cn/v1',
  [PROVIDERS.MINIMAX]: 'https://api.minimax.chat/v1',
  [PROVIDERS.GLM]: 'https://open.bigmodel.cn/api/paas/v4',
  [PROVIDERS.OPENROUTER]: 'https://openrouter.ai/api/v1',
  [PROVIDERS.FIREWORKS]: 'https://api.fireworks.ai/inference/v1',
  [PROVIDERS.OLLAMA]: 'http://localhost:11434',
  [PROVIDERS.VLLM]: 'http://localhost:8000/v1',
  [PROVIDERS.LMSTUDIO]: 'http://localhost:1234/v1'
};

// Providers that don't require API keys (local providers)
const OPTIONAL_API_KEY_PROVIDERS = [
  PROVIDERS.OLLAMA,
  PROVIDERS.VLLM,
  PROVIDERS.LMSTUDIO
];

// Providers that support custom endpoints
const CUSTOM_ENDPOINT_PROVIDERS = [
  PROVIDERS.OLLAMA,
  PROVIDERS.VLLM,
  PROVIDERS.LMSTUDIO,
  PROVIDERS.OPENAI, // For OpenAI-compatible endpoints
  PROVIDERS.OPENROUTER,
  PROVIDERS.FIREWORKS
];

module.exports = {
  PROVIDERS,
  MODELS,
  DEFAULT_MODELS,
  PROVIDER_ENDPOINTS,
  OPTIONAL_API_KEY_PROVIDERS,
  CUSTOM_ENDPOINT_PROVIDERS
};

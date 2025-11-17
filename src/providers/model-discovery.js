/**
 * Model Discovery Service
 * Dynamically fetches available models from providers that support it
 * Prioritizes latest and largest models
 * Includes health checking for local providers
 */

const { PROVIDER_ENDPOINTS, PROVIDERS } = require('./models');

class ModelDiscovery {
  /**
   * Fetch available models from OpenRouter
   * @param {string} apiKey - OpenRouter API key (optional for model list)
   * @returns {Promise<Array>} - Array of model objects
   */
  static async fetchOpenRouterModels(apiKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': apiKey ? `Bearer ${apiKey}` : undefined,
          'HTTP-Referer': 'https://github.com/liuyipei/llm-dom-browser',
          'X-Title': 'LLM-DOM-Browser'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch OpenRouter models: ${response.statusText}`);
      }

      const data = await response.json();

      // Filter and sort models
      return this._filterAndSortModels(data.data || [], 'openrouter');
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return [];
    }
  }

  /**
   * Fetch available models from Fireworks
   * @param {string} apiKey - Fireworks API key
   * @returns {Promise<Array>} - Array of model objects
   */
  static async fetchFireworksModels(apiKey) {
    try {
      const response = await fetch('https://api.fireworks.ai/inference/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Fireworks models: ${response.statusText}`);
      }

      const data = await response.json();

      // Filter and sort models
      return this._filterAndSortModels(data.data || [], 'fireworks');
    } catch (error) {
      console.error('Error fetching Fireworks models:', error);
      return [];
    }
  }

  /**
   * Filter and sort models to prioritize latest and largest
   * @param {Array} models - Raw model list from API
   * @param {string} provider - Provider name
   * @returns {Array} - Filtered and sorted models
   */
  static _filterAndSortModels(models, provider) {
    // Filter out deprecated, preview, and small models
    let filtered = models.filter(model => {
      const name = (model.id || model.name || '').toLowerCase();

      // Exclude patterns
      const excludePatterns = [
        'preview', 'beta', 'deprecated', 'legacy',
        'mini', 'nano', 'tiny', 'small',
        'test', 'experimental', 'alpha'
      ];

      if (excludePatterns.some(pattern => name.includes(pattern))) {
        return false;
      }

      // Only include chat/instruct models for Fireworks
      if (provider === 'fireworks') {
        if (!name.includes('instruct') && !name.includes('chat')) {
          return false;
        }
      }

      return true;
    });

    // Prioritize based on model characteristics
    filtered.forEach(model => {
      const name = (model.id || model.name || '').toLowerCase();
      let priority = 0;

      // Latest models (higher version numbers)
      if (name.includes('gpt-5') || name.includes('claude-4') || name.includes('grok-4')) {
        priority += 1000;
      } else if (name.includes('gpt-4') || name.includes('claude-3.5') || name.includes('grok-3')) {
        priority += 800;
      }

      // Large models
      if (name.includes('405b') || name.includes('400b')) {
        priority += 500;
      } else if (name.includes('70b') || name.includes('72b')) {
        priority += 400;
      } else if (name.includes('32b') || name.includes('34b')) {
        priority += 300;
      }

      // Instruct/Chat tuned
      if (name.includes('instruct') || name.includes('chat')) {
        priority += 100;
      }

      // Reasoning models
      if (name.includes('thinking') || name.includes('reasoning') || name.includes('o1') || name.includes('r1')) {
        priority += 200;
      }

      // Latest releases (2025, 2024)
      if (name.includes('2025')) {
        priority += 150;
      } else if (name.includes('2024')) {
        priority += 100;
      }

      model._priority = priority;
    });

    // Sort by priority (highest first)
    filtered.sort((a, b) => (b._priority || 0) - (a._priority || 0));

    // Limit to top 20 models
    return filtered.slice(0, 20).map(model => ({
      id: model.id || model.name,
      name: model.name || model.id,
      context_length: model.context_length || model.max_context_length,
      pricing: model.pricing,
      description: model.description
    }));
  }

  /**
   * Get model recommendations for a provider
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key (if needed)
   * @returns {Promise<Object>} - Recommended models by category
   */
  static async getRecommendedModels(provider, apiKey) {
    let models = [];

    switch (provider) {
      case 'openrouter':
        models = await this.fetchOpenRouterModels(apiKey);
        break;
      case 'fireworks':
        models = await this.fetchFireworksModels(apiKey);
        break;
      default:
        return null;
    }

    if (models.length === 0) {
      return null;
    }

    // Categorize models
    const categorized = {
      flagship: models.slice(0, 3),  // Top 3 best models
      reasoning: models.filter(m =>
        (m.id || '').toLowerCase().includes('thinking') ||
        (m.id || '').toLowerCase().includes('o1') ||
        (m.id || '').toLowerCase().includes('r1')
      ).slice(0, 3),
      coding: models.filter(m =>
        (m.id || '').toLowerCase().includes('code') ||
        (m.description || '').toLowerCase().includes('coding')
      ).slice(0, 3),
      all: models
    };

    return categorized;
  }

  /**
   * Format model for display in UI
   * @param {Object} model - Model object
   * @returns {string} - Formatted display name
   */
  static formatModelName(model) {
    if (!model) return 'Unknown';

    const name = model.name || model.id;
    const context = model.context_length ? ` (${Math.floor(model.context_length / 1000)}K)` : '';

    return `${name}${context}`;
  }

  /**
   * Fetch available models from Ollama
   * @param {string} endpoint - Ollama endpoint URL
   * @returns {Promise<Array>} - Array of model objects
   */
  static async fetchOllamaModels(endpoint = 'http://localhost:11434') {
    try {
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.models || []).map(model => ({
        id: model.name,
        name: model.name,
        size: model.size,
        modified_at: model.modified_at,
        digest: model.digest,
        details: model.details
      }));
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }

  /**
   * Fetch available models from vLLM
   * @param {string} endpoint - vLLM endpoint URL
   * @param {string} apiKey - Optional API key
   * @returns {Promise<Array>} - Array of model objects
   */
  static async fetchVLLMModels(endpoint = 'http://localhost:8000/v1', apiKey = 'dummy-key') {
    try {
      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vLLM models: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []).map(model => ({
        id: model.id,
        name: model.id,
        created: model.created,
        owned_by: model.owned_by
      }));
    } catch (error) {
      console.error('Error fetching vLLM models:', error);
      return [];
    }
  }

  /**
   * Fetch available models from LM Studio
   * @param {string} endpoint - LM Studio endpoint URL
   * @param {string} apiKey - Optional API key
   * @returns {Promise<Array>} - Array of model objects
   */
  static async fetchLMStudioModels(endpoint = 'http://localhost:1234/v1', apiKey = 'lm-studio') {
    try {
      const response = await fetch(`${endpoint}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch LM Studio models: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []).filter(model => {
        // Filter out placeholder models
        return model.id && !model.id.includes('placeholder');
      }).map(model => ({
        id: model.id,
        name: model.id,
        created: model.created
      }));
    } catch (error) {
      console.error('Error fetching LM Studio models:', error);
      return [];
    }
  }

  /**
   * Check health of a local provider
   * @param {string} provider - Provider name (ollama, vllm, lmstudio)
   * @param {string} endpoint - Optional custom endpoint
   * @returns {Promise<Object>} - Health check result
   */
  static async checkProviderHealth(provider, endpoint = null) {
    const baseEndpoint = endpoint || PROVIDER_ENDPOINTS[provider];

    try {
      let url;
      let headers = { 'Content-Type': 'application/json' };

      switch (provider) {
        case PROVIDERS.OLLAMA:
          url = `${baseEndpoint}/api/tags`;
          break;
        case PROVIDERS.VLLM:
          url = `${baseEndpoint}/models`;
          headers['Authorization'] = 'Bearer dummy-key';
          break;
        case PROVIDERS.LMSTUDIO:
          url = `${baseEndpoint}/models`;
          headers['Authorization'] = 'Bearer lm-studio';
          break;
        default:
          return {
            healthy: false,
            error: 'Unknown provider',
            provider,
            endpoint: baseEndpoint
          };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          healthy: true,
          provider,
          endpoint: baseEndpoint,
          status: response.status
        };
      } else {
        return {
          healthy: false,
          provider,
          endpoint: baseEndpoint,
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        healthy: false,
        provider,
        endpoint: baseEndpoint,
        error: error.name === 'AbortError' ? 'Connection timeout' : error.message
      };
    }
  }

  /**
   * Fetch models for local provider with health check
   * @param {string} provider - Provider name
   * @param {string} endpoint - Optional custom endpoint
   * @param {string} apiKey - Optional API key
   * @returns {Promise<Object>} - Models and health status
   */
  static async fetchLocalProviderModels(provider, endpoint = null, apiKey = null) {
    const baseEndpoint = endpoint || PROVIDER_ENDPOINTS[provider];

    // First check health
    const health = await this.checkProviderHealth(provider, baseEndpoint);

    if (!health.healthy) {
      return {
        models: [],
        health,
        error: health.error
      };
    }

    // Fetch models based on provider type
    let models = [];
    try {
      switch (provider) {
        case PROVIDERS.OLLAMA:
          models = await this.fetchOllamaModels(baseEndpoint);
          break;
        case PROVIDERS.VLLM:
          models = await this.fetchVLLMModels(baseEndpoint, apiKey || 'dummy-key');
          break;
        case PROVIDERS.LMSTUDIO:
          models = await this.fetchLMStudioModels(baseEndpoint, apiKey || 'lm-studio');
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${provider} models:`, error);
    }

    return {
      models,
      health,
      provider,
      endpoint: baseEndpoint
    };
  }
}

module.exports = ModelDiscovery;

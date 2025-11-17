/**
 * Model Discovery Service
 * Dynamically fetches available models from providers that support it
 * Prioritizes latest and largest models
 */

const { PROVIDER_ENDPOINTS } = require('./models');

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
}

module.exports = ModelDiscovery;

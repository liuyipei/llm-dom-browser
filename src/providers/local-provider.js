/**
 * Base class for local LLM providers (Ollama, vLLM, LM Studio)
 * Provides common functionality for locally hosted models
 */

const BaseProvider = require('./base-provider');

class LocalProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    // API key is optional for local providers
    this.requiresApiKey = config.requiresApiKey !== undefined ? config.requiresApiKey : false;

    // Endpoints for health checks and model listing
    this.healthCheckEndpoint = config.healthCheckEndpoint || '/models';
    this.listModelsEndpoint = config.listModelsEndpoint || '/models';
  }

  /**
   * Check if the local service is running and accessible
   * @returns {Promise<boolean>} - True if service is running
   */
  async healthCheck() {
    try {
      const url = `${this.baseUrl}${this.healthCheckEndpoint}`;
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add authorization header if API key is present
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available models from local instance
   * @returns {Promise<Array>} - Array of model objects
   */
  async listModels() {
    const url = `${this.baseUrl}${this.listModelsEndpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authorization header if API key is present
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseModelsResponse(data);
    } catch (error) {
      console.error(`Error listing models from ${this.constructor.name}:`, error);
      throw error;
    }
  }

  /**
   * Parse the models response - override in subclasses if format differs
   * @param {Object} data - Raw response data
   * @returns {Array} - Parsed model array
   */
  parseModelsResponse(data) {
    // Default: assume data.data format (OpenAI-compatible)
    return data.data || data.models || [];
  }

  /**
   * Parse streaming responses - can be overridden for different formats
   * @param {Response} response - The fetch response
   * @param {Function} onData - Callback for each parsed data chunk
   * @param {string} format - Stream format: 'sse' (Server-Sent Events) or 'ndjson' (Newline-Delimited JSON)
   * @returns {Promise<void>}
   */
  async parseStream(response, onData, format = 'sse') {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            if (format === 'sse') {
              // Server-Sent Events format (OpenAI-compatible)
              if (line.trim() === 'data: [DONE]') continue;
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                onData(data);
              }
            } else if (format === 'ndjson') {
              // Newline-Delimited JSON format (Ollama)
              const data = JSON.parse(line);
              onData(data);
            }
          } catch (e) {
            console.error(`Error parsing ${format} stream data:`, e, line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

module.exports = LocalProvider;

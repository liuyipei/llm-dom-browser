/**
 * Ollama provider implementation
 * Supports locally hosted Ollama models via http://localhost:11434
 * API Documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

const LocalProvider = require('./local-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class OllamaProvider extends LocalProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.ollama || 'http://localhost:11434',
      // Ollama uses different endpoints
      healthCheckEndpoint: '/api/tags',
      listModelsEndpoint: '/api/tags',
      requiresApiKey: false
    });
    // API key is optional for local Ollama
    this.validateConfig(['model']);
  }

  /**
   * Generate a completion using Ollama's API
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {Promise<Object>} - The generated response with metadata
   */
  async generateCompletion(prompt, options = {}) {
    const url = `${this.baseUrl}/api/chat`;

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 2000
      }
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`Ollama API error: ${errorMessage}`);
    }

    const data = await response.json();

    // Return full metadata
    return {
      text: data.message?.content || '',
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      model: data.model,
      done: data.done
    };
  }

  /**
   * Override to parse Ollama's model list format
   * @param {Object} data - Raw response data
   * @returns {Array} - Parsed model array
   */
  parseModelsResponse(data) {
    return data.models || [];
  }

  /**
   * Generate a streaming completion
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Options like temperature, maxTokens
   * @returns {AsyncGenerator<string>} - Stream of text chunks
   */
  async *generateStreamingCompletion(prompt, options = {}) {
    const url = `${this.baseUrl}/api/chat`;

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: true,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 2000
      }
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`Ollama API error: ${errorMessage}`);
    }

    // Use shared stream parser with generator pattern
    const chunks = [];
    let resolveNext = null;
    let streamDone = false;

    const parsePromise = this.parseStream(response, (data) => {
      const content = data.message?.content;
      if (content) {
        chunks.push(content);
        if (resolveNext) {
          resolveNext();
          resolveNext = null;
        }
      }
    }, 'ndjson').then(() => {
      streamDone = true;
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    });

    while (!streamDone || chunks.length > 0) {
      if (chunks.length > 0) {
        yield chunks.shift();
      } else if (!streamDone) {
        await new Promise(resolve => { resolveNext = resolve; });
      }
    }

    await parsePromise;
  }

  /**
   * Pull a model from Ollama library
   * @param {string} modelName - Name of the model to pull (e.g., 'llama2', 'mistral')
   * @param {Function} onProgress - Optional callback for progress updates
   * @returns {Promise<Object>} - Pull result
   */
  async pullModel(modelName, onProgress = null) {
    const url = `${this.baseUrl}/api/pull`;

    const requestBody = {
      name: modelName,
      stream: !!onProgress
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`Failed to pull model: ${errorMessage}`);
    }

    if (onProgress) {
      // Stream progress updates using shared parser
      await this.parseStream(response, onProgress, 'ndjson');
      return { success: true, model: modelName };
    } else {
      // Non-streaming pull
      const data = await response.json();
      return data;
    }
  }

  /**
   * Delete a model from local Ollama instance
   * @param {string} modelName - Name of the model to delete
   * @returns {Promise<Object>} - Delete result
   */
  async deleteModel(modelName) {
    const url = `${this.baseUrl}/api/delete`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: modelName })
    });

    if (!response.ok) {
      const errorMessage = await this.formatErrorMessage(response);
      throw new Error(`Failed to delete model: ${errorMessage}`);
    }

    return { success: true };
  }
}

module.exports = OllamaProvider;

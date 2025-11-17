/**
 * Ollama provider implementation
 * Supports locally hosted Ollama models via http://localhost:11434
 * API Documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

const BaseProvider = require('./base-provider');
const { PROVIDER_ENDPOINTS } = require('./models');

class OllamaProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || PROVIDER_ENDPOINTS.ollama || 'http://localhost:11434'
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
   * Parse Ollama's newline-delimited JSON stream
   * @private
   * @param {Response} response - The fetch response object
   * @param {Function} onData - Callback called for each parsed JSON object
   * @returns {Promise<void>}
   */
  async _parseOllamaStream(response, onData) {
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
            const data = JSON.parse(line);
            onData(data);
          } catch (e) {
            console.error('Error parsing Ollama stream data:', e, line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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

    const parsePromise = this._parseOllamaStream(response, (data) => {
      const content = data.message?.content;
      if (content) {
        chunks.push(content);
        if (resolveNext) {
          resolveNext();
          resolveNext = null;
        }
      }
    }).then(() => {
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
   * List available models from local Ollama instance
   * @returns {Promise<Array>} - Array of model objects
   */
  async listModels() {
    const url = `${this.baseUrl}/api/tags`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list Ollama models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      throw error;
    }
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
      await this._parseOllamaStream(response, onProgress);
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

  /**
   * Check if Ollama service is running and accessible
   * @returns {Promise<boolean>} - True if service is running
   */
  async healthCheck() {
    try {
      const url = `${this.baseUrl}/api/tags`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = OllamaProvider;

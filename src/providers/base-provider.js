/**
 * Base provider class that all LLM providers extend
 * Provides common functionality for API calls, retries, and error handling
 */

class BaseProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 60000; // 60 seconds
  }

  /**
   * Main method to generate a completion - must be implemented by subclasses
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - Additional options (temperature, maxTokens, etc.)
   * @returns {Promise<string>} - The generated text
   */
  async generateCompletion(prompt, options = {}) {
    throw new Error('generateCompletion must be implemented by subclass');
  }

  /**
   * Helper method to make HTTP requests with retry logic
   * @param {string} url - The URL to request
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} - The fetch response
   */
  async fetchWithRetry(url, options, retryCount = 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429 && retryCount < this.maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;

        console.log(`Rate limited. Retrying after ${delay}ms...`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, retryCount + 1);
      }

      // Handle server errors (5xx) with exponential backoff
      if (response.status >= 500 && retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Server error ${response.status}. Retrying after ${delay}ms...`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, retryCount + 1);
      }

      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      // Retry on network errors
      if (retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Network error: ${error.message}. Retrying after ${delay}ms...`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Helper method to parse streaming responses
   * @param {Response} response - The fetch response
   * @param {Function} onChunk - Callback for each chunk
   */
  async *streamResponse(response) {
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
          if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (e) {
              console.error('Error parsing SSE data:', e, line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Helper method to sleep for a specified duration
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate that required configuration is present
   * @param {Array<string>} requiredFields - List of required field names
   */
  validateConfig(requiredFields) {
    for (const field of requiredFields) {
      if (!this[field]) {
        throw new Error(`${field} is required for ${this.constructor.name}`);
      }
    }
  }

  /**
   * Format error messages from API responses
   * @param {Response} response - The error response
   * @returns {Promise<string>} - Formatted error message
   */
  async formatErrorMessage(response) {
    try {
      const errorData = await response.json();
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          return errorData.error;
        }
        return errorData.error.message || JSON.stringify(errorData.error);
      }
      return JSON.stringify(errorData);
    } catch (e) {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }
}

module.exports = BaseProvider;

/**
 * Chat UI Preload Script
 * Runs in the chat UI renderer process with context isolation
 * Safely exposes IPC methods for the chat interface
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Safely expose IPC methods to chat UI renderer
 * Each method is wrapped to validate arguments and handle errors
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Open a new tab with a URL or file path
   */
  openTab: (url) => {
    if (typeof url !== 'string' || !url.trim()) {
      throw new Error('Invalid URL');
    }
    return ipcRenderer.invoke('open-tab', url.trim());
  },

  /**
   * Close a tab by ID
   */
  closeTab: (tabId) => {
    if (typeof tabId !== 'string') {
      throw new Error('Invalid tab ID');
    }
    return ipcRenderer.invoke('close-tab', tabId);
  },

  /**
   * Switch to a different tab
   */
  switchTab: (tabId) => {
    if (typeof tabId !== 'string') {
      throw new Error('Invalid tab ID');
    }
    return ipcRenderer.invoke('switch-tab', tabId);
  },

  /**
   * Get all tabs with their information (id, url, title, isActive)
   */
  getAllTabs: () => {
    return ipcRenderer.invoke('get-all-tabs');
  },

  /**
   * Extract content from a tab for LLM analysis
   */
  extractContent: (tabId) => {
    if (typeof tabId !== 'string') {
      throw new Error('Invalid tab ID');
    }
    return ipcRenderer.invoke('extract-content', tabId);
  },

  /**
   * Send a query to the LLM with context from selected tabs
   */
  queryLLM: (query, tabIds, apiKey, provider = 'openai', model = null, includeMedia = false, customEndpoint = null) => {
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('Invalid query');
    }
    if (!Array.isArray(tabIds)) {
      throw new Error('Tab IDs must be an array');
    }
    // API key validation is optional for local providers
    if (typeof apiKey !== 'string') {
      apiKey = ''; // Allow empty API key for local providers
    }
    return ipcRenderer.invoke('query-llm', {
      query: query.trim(),
      tabIds,
      apiKey,
      provider,
      model,
      includeMedia,
      customEndpoint
    });
  },

  /**
   * Send a query to the LLM with streaming support
   * Returns an object with cleanup function
   */
  queryLLMStreaming: (query, tabIds, apiKey, provider = 'openai', model = null, includeMedia = false, customEndpoint = null, callbacks = {}) => {
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('Invalid query');
    }
    if (!Array.isArray(tabIds)) {
      throw new Error('Tab IDs must be an array');
    }
    // API key validation is optional for local providers
    if (typeof apiKey !== 'string') {
      apiKey = ''; // Allow empty API key for local providers
    }

    // Generate unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Set up event listeners for streaming
    const chunkListener = (event, data) => {
      if (data.requestId === requestId) {
        if (callbacks.onChunk && typeof callbacks.onChunk === 'function') {
          callbacks.onChunk(data.chunk);
        }
      }
    };

    const completeListener = (event, data) => {
      if (data.requestId === requestId) {
        if (callbacks.onComplete && typeof callbacks.onComplete === 'function') {
          callbacks.onComplete();
        }
        // Clean up listeners after completion
        cleanup();
      }
    };

    const errorListener = (event, data) => {
      if (data.requestId === requestId) {
        if (callbacks.onError && typeof callbacks.onError === 'function') {
          callbacks.onError(new Error(data.error || 'Streaming error'));
        }
        // Clean up listeners after error
        cleanup();
      }
    };

    // Function to clean up listeners
    const cleanup = () => {
      ipcRenderer.removeListener('llm-stream-chunk', chunkListener);
      ipcRenderer.removeListener('llm-stream-complete', completeListener);
      ipcRenderer.removeListener('llm-stream-error', errorListener);
    };

    // Attach listeners
    ipcRenderer.on('llm-stream-chunk', chunkListener);
    ipcRenderer.on('llm-stream-complete', completeListener);
    ipcRenderer.on('llm-stream-error', errorListener);

    // Start the streaming request
    const invokePromise = ipcRenderer.invoke('query-llm-streaming', {
      requestId,
      query: query.trim(),
      tabIds,
      apiKey,
      provider,
      model,
      includeMedia,
      customEndpoint
    });

    // Return cleanup function and request ID
    return {
      requestId,
      cleanup,
      promise: invokePromise
    };
  },

  /**
   * Get available providers and models
   */
  getProviders: () => {
    return ipcRenderer.invoke('get-providers');
  },

  /**
   * Fetch models dynamically for a provider (OpenRouter, Fireworks)
   */
  fetchProviderModels: (provider, apiKey) => {
    return ipcRenderer.invoke('fetch-provider-models', { provider, apiKey });
  },

  /**
   * Check health of local provider (Ollama, vLLM, LM Studio)
   */
  checkProviderHealth: (provider, endpoint) => {
    return ipcRenderer.invoke('check-provider-health', { provider, endpoint });
  },

  /**
   * Fetch models from local provider
   */
  fetchLocalModels: (provider, endpoint, apiKey) => {
    return ipcRenderer.invoke('fetch-local-models', { provider, endpoint, apiKey });
  },

  /**
   * Pull Ollama model
   */
  ollamaPullModel: (modelName, endpoint) => {
    return ipcRenderer.invoke('ollama-pull-model', { modelName, endpoint });
  },

  /**
   * List Ollama models
   */
  ollamaListModels: (endpoint) => {
    return ipcRenderer.invoke('ollama-list-models', { endpoint });
  },

  /**
   * Listen for Ollama pull progress updates
   */
  onOllamaPullProgress: (callback) => {
    const listener = (event, data) => {
      callback(data);
    };
    ipcRenderer.on('ollama-pull-progress', listener);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('ollama-pull-progress', listener);
  },

  /**
   * Upload and process a file (PDF, text, doc)
   */
  uploadFile: (filePath, fileName) => {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new Error('Invalid file path');
    }
    if (typeof fileName !== 'string' || !fileName.trim()) {
      throw new Error('Invalid file name');
    }
    return ipcRenderer.invoke('upload-file', {
      filePath: filePath.trim(),
      fileName: fileName.trim()
    });
  },

  /**
   * Listen for events from main process
   */
  onContentUpdated: (callback) => {
    const listener = (event, data) => {
      callback(data);
    };
    ipcRenderer.on('content-updated', listener);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('content-updated', listener);
  },

  /**
   * Listen for tab title updates
   */
  onTabTitleUpdated: (callback) => {
    const listener = (event, data) => {
      callback(data);
    };
    ipcRenderer.on('tab-title-updated', listener);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('tab-title-updated', listener);
  },

  /**
   * Listen for active tab changes
   */
  onActiveTabChanged: (callback) => {
    const listener = (event, data) => {
      callback(data);
    };
    ipcRenderer.on('active-tab-changed', listener);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('active-tab-changed', listener);
  },

  /**
   * Listen for bookmark toggle requests
   */
  onToggleBookmark: (callback) => {
    const listener = (event) => {
      callback();
    };
    ipcRenderer.on('toggle-bookmark', listener);
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('toggle-bookmark', listener);
  },

  /**
   * Update chat sidebar width (for resizable split)
   */
  updateChatWidth: (width) => {
    if (typeof width !== 'number' || width < 0) {
      throw new Error('Invalid width');
    }
    return ipcRenderer.invoke('update-chat-width', width);
  },

  /**
   * Version info for debugging
   */
  version: '1.0.0'
});

console.log('Chat preload script loaded');

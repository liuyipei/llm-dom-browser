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
  queryLLM: (query, tabIds, apiKey, provider = 'openai', model = null) => {
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('Invalid query');
    }
    if (!Array.isArray(tabIds)) {
      throw new Error('Tab IDs must be an array');
    }
    if (typeof apiKey !== 'string') {
      throw new Error('Invalid API key');
    }
    return ipcRenderer.invoke('query-llm', {
      query: query.trim(),
      tabIds,
      apiKey,
      provider,
      model
    });
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
   * Get app version and info
   */
  getAppInfo: () => {
    return ipcRenderer.invoke('get-app-info');
  },

  /**
   * Version info for debugging
   */
  version: '1.0.0'
});

console.log('Chat preload script loaded');

const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { generateId, isValidFilePath, extractFilePathFromURL, handleAsyncError, createErrorResult } = require('./utils');

/**
 * IPC Handlers - Registers all IPC handlers for main process communication
 */
class IPCHandlers {
  constructor(options = {}) {
    this.tabManager = options.tabManager;
    this.windowManager = options.windowManager;
    this.llmOrchestrator = options.llmOrchestrator;
    this.pdfService = options.pdfService;
    this.contentViews = options.contentViews;
  }

  /**
   * Update handler references (called when dependencies change)
   */
  updateReferences(options = {}) {
    if (options.tabManager) this.tabManager = options.tabManager;
    if (options.windowManager) this.windowManager = options.windowManager;
    if (options.llmOrchestrator) this.llmOrchestrator = options.llmOrchestrator;
    if (options.pdfService) this.pdfService = options.pdfService;
    if (options.contentViews) this.contentViews = options.contentViews;
  }

  /**
   * Register all IPC handlers
   */
  registerAll() {
    this.registerTabHandlers();
    this.registerContentHandlers();
    this.registerLLMHandlers();
    this.registerProviderHandlers();
    this.registerFileHandlers();
    this.registerWindowHandlers();
  }

  /**
   * Register tab-related IPC handlers
   */
  registerTabHandlers() {
    // Handle IPC: Open new tab with URL or PDF
    ipcMain.handle('open-tab', async (event, url) => {
      return await this.tabManager.openTab(url);
    });

    // Handle IPC: Open link in new tab (with foreground/background option)
    // This is sent from content-preload.js when user Ctrl+clicks or middle-clicks a link
    ipcMain.on('open-link-in-new-tab', async (event, { url, foreground }) => {
      try {
        console.log(`Opening link in new ${foreground ? 'foreground' : 'background'} tab: ${url}`);
        await this.tabManager.openTab(url, { activate: foreground });
      } catch (error) {
        console.error('Error opening link in new tab:', error);
      }
    });

    // Handle IPC: Close tab
    ipcMain.handle('close-tab', (event, tabId) => {
      return this.tabManager.closeTab(tabId);
    });

    // Handle IPC: Switch to a different tab
    ipcMain.handle('switch-tab', (event, tabId) => {
      return this.tabManager.switchTab(tabId);
    });

    // Handle IPC: Get all tabs with their information
    ipcMain.handle('get-all-tabs', () => {
      return this.tabManager.getAllTabsInfo();
    });
  }

  /**
   * Register content extraction IPC handlers
   */
  registerContentHandlers() {
    // Handle IPC: Extract content from view for LLM analysis
    ipcMain.handle('extract-content', handleAsyncError(async (event, tabId, options = {}) => {
      const view = this.contentViews.get(tabId);
      if (!view) {
        throw new Error(`View ${tabId} not found`);
      }

      const url = view.webContents.getURL();
      const title = view.webContents.getTitle();

      // Check if this is a PDF
      if (url.endsWith('.pdf') || url.includes('.pdf?')) {
        // PDF: Extract text using pdf-parse in main process
        const pdfPath = extractFilePathFromURL(url);
        const pdfText = await this.pdfService.extractText(pdfPath);
        return {
          type: 'pdf',
          title,
          url,
          text: pdfText.slice(0, 5000), // Limit to 5000 chars for token efficiency
          totalLength: pdfText.length
        };
      } else {
        // HTML: Serialize DOM via preload script
        try {
          // Validate options to prevent injection
          const safeOptions = {
            includeMedia: Boolean(options?.includeMedia)
          };
          const domData = await view.webContents.executeJavaScript(
            `window.contentAPI ? window.contentAPI.getSerializedDOM(${JSON.stringify(safeOptions)}) : null`
          );
          return {
            type: 'html',
            title,
            url,
            dom: domData
          };
        } catch (jsError) {
          console.error('Failed to execute DOM serialization:', jsError);
          return {
            type: 'html',
            title,
            url,
            dom: null,
            error: 'DOM serialization failed'
          };
        }
      }
    }));
  }

  /**
   * Register LLM-related IPC handlers
   */
  registerLLMHandlers() {
    // Handle IPC: Send query to LLM with context
    ipcMain.handle('query-llm', handleAsyncError(async (event, { query, tabIds, apiKey, provider, model, includeMedia, customEndpoint }) => {
      return await this.llmOrchestrator.analyzeContent(query, tabIds, apiKey, provider, model, includeMedia, customEndpoint);
    }));

    // Handle IPC: Send query to LLM with streaming support
    ipcMain.handle('query-llm-streaming', async (event, { requestId, query, tabIds, apiKey, provider, model, includeMedia, customEndpoint }) => {
      try {
        // Start streaming and send chunks back to renderer
        for await (const chunk of this.llmOrchestrator.analyzeContentStreaming(query, tabIds, apiKey, provider, model, includeMedia, customEndpoint)) {
          event.sender.send('llm-stream-chunk', { requestId, chunk });
        }

        // Send completion signal
        event.sender.send('llm-stream-complete', { requestId });
        return { success: true, requestId };
      } catch (error) {
        console.error('Error in streaming LLM query:', error);
        event.sender.send('llm-stream-error', { requestId, error: error.message });
        return createErrorResult(error);
      }
    });
  }

  /**
   * Register provider-related IPC handlers
   */
  registerProviderHandlers() {
    // Handle IPC: Get available providers and models
    ipcMain.handle('get-providers', handleAsyncError(async () => {
      return this.llmOrchestrator.getAvailableProviders();
    }));

    // Handle IPC: Fetch models dynamically for a provider
    ipcMain.handle('fetch-provider-models', handleAsyncError(async (event, { provider, apiKey }) => {
      const ModelDiscovery = require('./providers/model-discovery');
      const models = await ModelDiscovery.getRecommendedModels(provider, apiKey);
      return { success: true, models };
    }));

    // Handle IPC: Check health of local provider
    ipcMain.handle('check-provider-health', handleAsyncError(async (event, { provider, endpoint }) => {
      const ModelDiscovery = require('./providers/model-discovery');
      const health = await ModelDiscovery.checkProviderHealth(provider, endpoint);
      return { success: true, health };
    }));

    // Handle IPC: Fetch models from local provider
    ipcMain.handle('fetch-local-models', handleAsyncError(async (event, { provider, endpoint, apiKey }) => {
      const ModelDiscovery = require('./providers/model-discovery');
      const result = await ModelDiscovery.fetchLocalProviderModels(provider, endpoint, apiKey);
      return { success: true, ...result };
    }));

    // Handle IPC: Pull Ollama model
    ipcMain.handle('ollama-pull-model', handleAsyncError(async (event, { modelName, endpoint }) => {
      const OllamaProvider = require('./providers/ollama-provider');
      const ollama = new OllamaProvider({
        baseUrl: endpoint || 'http://localhost:11434',
        model: modelName
      });

      const chatView = this.windowManager.getChatView();

      // Pull with progress updates
      const result = await ollama.pullModel(modelName, (progress) => {
        // Send progress updates to renderer
        if (chatView && chatView.webContents) {
          chatView.webContents.send('ollama-pull-progress', {
            modelName,
            progress
          });
        }
      });

      return { success: true, result };
    }));

    // Handle IPC: List Ollama models
    ipcMain.handle('ollama-list-models', handleAsyncError(async (event, { endpoint }) => {
      const OllamaProvider = require('./providers/ollama-provider');
      const ollama = new OllamaProvider({
        baseUrl: endpoint || 'http://localhost:11434',
        model: 'dummy' // Required for validation but not used for listing
      });

      const models = await ollama.listModels();
      return { success: true, models };
    }));
  }

  /**
   * Register file-related IPC handlers
   */
  registerFileHandlers() {
    // Handle IPC: Upload and process file
    ipcMain.handle('upload-file', handleAsyncError(async (event, { filePath, fileName }) => {
      // Validate file path for security
      if (!isValidFilePath(filePath)) {
        throw new Error('Invalid file path');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // Get file extension
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.pdf') {
        // Process PDF
        const pdfText = await this.pdfService.extractText(filePath);
        const tabId = generateId();
        return {
          tabId,
          fileName,
          type: 'pdf',
          textPreview: pdfText.slice(0, 500),
          fullPath: filePath
        };
      } else if (['.txt', '.md', '.doc', '.docx'].includes(ext)) {
        // Process text files
        let content = fs.readFileSync(filePath, 'utf-8');
        const tabId = generateId();
        return {
          tabId,
          fileName,
          type: 'text',
          content: content.slice(0, 5000),
          fullPath: filePath
        };
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }
    }));
  }

  /**
   * Register window-related IPC handlers
   */
  registerWindowHandlers() {
    // Handle IPC: Update chat width (for resizable split)
    ipcMain.handle('update-chat-width', (event, newWidth) => {
      return this.windowManager.updateChatWidth(newWidth);
    });
  }
}

module.exports = IPCHandlers;

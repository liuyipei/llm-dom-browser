const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { generateId, isValidFilePath, extractFilePathFromURL } = require('./utils');

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
    ipcMain.handle('extract-content', async (event, tabId, options = {}) => {
      try {
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
            const domData = await view.webContents.executeJavaScript(
              `window.contentAPI ? window.contentAPI.getSerializedDOM(${JSON.stringify(options)}) : null`
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
      } catch (error) {
        console.error('Error extracting content:', error);
        throw error;
      }
    });
  }

  /**
   * Register LLM-related IPC handlers
   */
  registerLLMHandlers() {
    // Handle IPC: Send query to LLM with context
    ipcMain.handle('query-llm', async (event, { query, tabIds, apiKey, provider, model, includeMedia, customEndpoint }) => {
      try {
        return await this.llmOrchestrator.analyzeContent(query, tabIds, apiKey, provider, model, includeMedia, customEndpoint);
      } catch (error) {
        console.error('Error querying LLM:', error);
        throw error;
      }
    });
  }

  /**
   * Register provider-related IPC handlers
   */
  registerProviderHandlers() {
    // Handle IPC: Get available providers and models
    ipcMain.handle('get-providers', async () => {
      try {
        return this.llmOrchestrator.getAvailableProviders();
      } catch (error) {
        console.error('Error getting providers:', error);
        return { error: error.message };
      }
    });

    // Handle IPC: Fetch models dynamically for a provider
    ipcMain.handle('fetch-provider-models', async (event, { provider, apiKey }) => {
      try {
        const ModelDiscovery = require('./services/llm-orchestrator').ModelDiscovery ||
                              require('./providers/model-discovery');
        const models = await ModelDiscovery.getRecommendedModels(provider, apiKey);
        return { success: true, models };
      } catch (error) {
        console.error('Error fetching provider models:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle IPC: Check health of local provider
    ipcMain.handle('check-provider-health', async (event, { provider, endpoint }) => {
      try {
        const ModelDiscovery = require('./providers/model-discovery');
        const health = await ModelDiscovery.checkProviderHealth(provider, endpoint);
        return { success: true, health };
      } catch (error) {
        console.error('Error checking provider health:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle IPC: Fetch models from local provider
    ipcMain.handle('fetch-local-models', async (event, { provider, endpoint, apiKey }) => {
      try {
        const ModelDiscovery = require('./providers/model-discovery');
        const result = await ModelDiscovery.fetchLocalProviderModels(provider, endpoint, apiKey);
        return { success: true, ...result };
      } catch (error) {
        console.error('Error fetching local models:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle IPC: Pull Ollama model
    ipcMain.handle('ollama-pull-model', async (event, { modelName, endpoint }) => {
      try {
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
      } catch (error) {
        console.error('Error pulling Ollama model:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle IPC: List Ollama models
    ipcMain.handle('ollama-list-models', async (event, { endpoint }) => {
      try {
        const OllamaProvider = require('./providers/ollama-provider');
        const ollama = new OllamaProvider({
          baseUrl: endpoint || 'http://localhost:11434',
          model: 'dummy' // Required for validation but not used for listing
        });

        const models = await ollama.listModels();
        return { success: true, models };
      } catch (error) {
        console.error('Error listing Ollama models:', error);
        return { success: false, error: error.message };
      }
    });
  }

  /**
   * Register file-related IPC handlers
   */
  registerFileHandlers() {
    // Handle IPC: Upload and process file
    ipcMain.handle('upload-file', async (event, { filePath, fileName }) => {
      try {
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
      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    });
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

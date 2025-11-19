const { ipcMain, dialog } = require('electron');
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
    // Handle IPC: Show file open dialog
    ipcMain.handle('show-open-dialog', async (event, options) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Supported Files', extensions: ['pdf', 'txt', 'md', 'doc', 'docx'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        ...options
      });
      return result;
    });

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

        // Create a background tab with the PDF file
        const fileUrl = `file://${filePath}`;
        const tabInfo = await this.tabManager.openTab(fileUrl, {
          activate: false, // Open in background
          fileContent: pdfText,
          fileType: 'pdf',
          fileName: fileName
        });

        return {
          tabId: tabInfo.id,
          fileName,
          type: 'pdf',
          textPreview: pdfText.slice(0, 500),
          fullPath: filePath,
          url: fileUrl
        };
      } else if (['.txt', '.md', '.doc', '.docx'].includes(ext)) {
        // Process text files
        let content = fs.readFileSync(filePath, 'utf-8');

        // Create an HTML page to display the text content
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${fileName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    h1 {
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
    }
  </style>
</head>
<body>
  <h1>${fileName}</h1>
  <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

        // Create a data URL for the HTML content
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

        // Create a background tab with the text file
        const tabInfo = await this.tabManager.openTab(dataUrl, {
          activate: false, // Open in background
          fileContent: content,
          fileType: 'text',
          fileName: fileName
        });

        return {
          tabId: tabInfo.id,
          fileName,
          type: 'text',
          content: content.slice(0, 5000),
          fullPath: filePath,
          url: dataUrl
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

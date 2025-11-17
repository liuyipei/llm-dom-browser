const { app, BaseWindow, WebContentsView, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const PDFService = require('./services/pdf-service');
const LLMOrchestrator = require('./services/llm-orchestrator');

let mainWindow;
let chatView; // Reference to chat UI view for sending updates
let persistentSession; // Persistent session for localStorage
const contentViews = new Map();
const llmOrchestrator = new LLMOrchestrator();
const pdfService = new PDFService();

/**
 * Initialize a persistent session for localStorage storage
 */
function initializePersistentSession() {
  // Get or create a persistent session named 'persist'
  persistentSession = session.fromPartition('persist:llm-dom-browser', { cache: true });

  console.log('Initialized persistent session for localStorage storage');
  return persistentSession;
}

/**
 * Generate a unique ID for tabs/views
 */
function generateId() {
  return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create and return the main application window with WebContentsView architecture
 */
function createWindow() {
  // Main window using BaseWindow (not BrowserWindow)
  mainWindow = new BaseWindow({
    width: 1400,
    height: 900,
    show: false
  });

  // Create chat UI view (left sidebar)
  // Use persistent session to enable localStorage persistence
  if (!persistentSession) {
    initializePersistentSession();
  }

  chatView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload', 'chat-preload.js'),
      sandbox: true,
      session: persistentSession
    }
  });

  chatView.setBounds({ x: 0, y: 0, width: 400, height: 900 });
  mainWindow.contentView.addChildView(chatView);

  // Load chat UI - in production this would be a built React app
  // For now, we'll load a simple HTML file
  const chatUIPath = path.join(__dirname, 'ui', 'chat.html');
  chatView.webContents.loadFile(chatUIPath).catch(err => {
    console.error('Failed to load chat UI:', err);
    // Fallback to data URL if file not found
    chatView.webContents.loadURL('data:text/html,<h1>Chat UI Loading...</h1>');
  });

  // Register the content views map with the LLM orchestrator
  llmOrchestrator.setContentViews(contentViews);

  // Handle IPC: Open new tab with URL or PDF
  ipcMain.handle('open-tab', async (event, url) => {
    try {
      const contentView = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload', 'content-preload.js'),
          plugins: true, // Enable PDF viewer
          sandbox: true
        }
      });

      contentView.setBounds({ x: 400, y: 0, width: 1000, height: 900 });
      mainWindow.contentView.addChildView(contentView);

      const tabId = generateId();
      contentViews.set(tabId, contentView);

      // Listen for page load completion to update title
      contentView.webContents.on('did-finish-load', () => {
        const title = contentView.webContents.getTitle();
        console.log(`Tab ${tabId} finished loading: ${title}`);

        // Send title update to chat UI
        if (chatView && chatView.webContents) {
          chatView.webContents.send('tab-title-updated', { tabId, title });
        }
      });

      // Also listen for explicit title updates (some sites update title after load)
      contentView.webContents.on('page-title-updated', (event, title) => {
        console.log(`Tab ${tabId} title updated: ${title}`);

        // Send title update to chat UI
        if (chatView && chatView.webContents) {
          chatView.webContents.send('tab-title-updated', { tabId, title });
        }
      });

      // Load the URL or PDF
      await contentView.webContents.loadURL(url);

      console.log(`Opened tab ${tabId} with URL: ${url}`);
      return { id: tabId, url };
    } catch (error) {
      console.error('Error opening tab:', error);
      throw error;
    }
  });

  // Handle IPC: Close tab
  ipcMain.handle('close-tab', (event, tabId) => {
    try {
      const view = contentViews.get(tabId);
      if (view) {
        mainWindow.contentView.removeChildView(view);
        view.webContents.destroy();
        contentViews.delete(tabId);
        console.log(`Closed tab ${tabId}`);
        return { success: true };
      }
      return { success: false, error: 'Tab not found' };
    } catch (error) {
      console.error('Error closing tab:', error);
      throw error;
    }
  });

  // Handle IPC: Extract content from view for LLM analysis
  ipcMain.handle('extract-content', async (event, tabId, options = {}) => {
    try {
      const view = contentViews.get(tabId);
      if (!view) {
        throw new Error(`View ${tabId} not found`);
      }

      const url = view.webContents.getURL();
      const title = view.webContents.getTitle();

      // Check if this is a PDF
      if (url.endsWith('.pdf') || url.includes('.pdf?')) {
        // PDF: Extract text using pdf-parse in main process
        const pdfPath = extractFilePathFromURL(url);
        const pdfText = await pdfService.extractText(pdfPath);
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

  // Handle IPC: Send query to LLM with context
  ipcMain.handle('query-llm', async (event, { query, tabIds, apiKey, provider, model, includeMedia }) => {
    try {
      return await llmOrchestrator.analyzeContent(query, tabIds, apiKey, provider, model, includeMedia);
    } catch (error) {
      console.error('Error querying LLM:', error);
      throw error;
    }
  });

  // Handle IPC: Get available providers and models
  ipcMain.handle('get-providers', async () => {
    try {
      return llmOrchestrator.getAvailableProviders();
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
        const pdfText = await pdfService.extractText(filePath);
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

  mainWindow.show();
}

/**
 * Validate file path to prevent directory traversal attacks
 */
function isValidFilePath(filePath) {
  // Basic validation - in production, use more robust checks
  return typeof filePath === 'string' && filePath.length > 0 && !filePath.includes('..');
}

/**
 * Extract actual file path from file:// URL
 */
function extractFilePathFromURL(url) {
  if (url.startsWith('file://')) {
    return decodeURIComponent(url.substring(7));
  }
  return url;
}

// App event handlers
app.whenReady().then(() => {
  initializePersistentSession();
  createWindow();
});

app.on('window-all-closed', () => {
  // On macOS, quit when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  // Destroy all content views
  contentViews.forEach((view, tabId) => {
    try {
      mainWindow.contentView.removeChildView(view);
      view.webContents.destroy();
    } catch (err) {
      console.error(`Error cleaning up view ${tabId}:`, err);
    }
  });
  contentViews.clear();
});

console.log('LLM-DOM-Browser Main Process Started');

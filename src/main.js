const { app, BaseWindow, WebContentsView, ipcMain, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');
const PDFService = require('./services/pdf-service');
const LLMOrchestrator = require('./services/llm-orchestrator');

let mainWindow;
let chatView; // Reference to chat UI view for sending updates
let persistentSession; // Persistent session for localStorage
const contentViews = new Map();
let activeTabId = null; // Track currently visible tab
let chatWidth = 400; // Default chat sidebar width, can be adjusted by user
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
 * Update all view bounds based on current window size
 */
function updateViewBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const bounds = mainWindow.getBounds();
  const contentWidth = bounds.width - chatWidth;

  // Update chat view bounds
  // Add small buffer to height to prevent bottom padding clipping
  if (chatView && !chatView.webContents.isDestroyed()) {
    chatView.setBounds({ x: 0, y: 0, width: chatWidth, height: bounds.height + 2 });
  }

  // Update all content view bounds
  // Use exact contentWidth - scrollbar will render within this space
  // Add +2px to height to prevent bottom clipping
  contentViews.forEach((view, tabId) => {
    if (view && !view.webContents.isDestroyed()) {
      view.setBounds({ x: chatWidth, y: 0, width: contentWidth, height: bounds.height + 2 });
    }
  });
}

/**
 * Create custom application menu
 */
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            // Focus URL input in chat view
            if (chatView && chatView.webContents) {
              chatView.webContents.executeJavaScript(`
                document.getElementById('urlInput')?.focus();
              `);
            }
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            // Close active tab
            if (activeTabId) {
              const view = contentViews.get(activeTabId);
              if (view) {
                mainWindow.contentView.removeChildView(view);
                view.webContents.destroy();
                contentViews.delete(activeTabId);

                const remainingTabs = Array.from(contentViews.keys());
                if (remainingTabs.length > 0) {
                  activeTabId = remainingTabs[0];
                  if (chatView && chatView.webContents) {
                    chatView.webContents.send('active-tab-changed', { tabId: activeTabId });
                  }
                } else {
                  activeTabId = null;
                }
              }
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Chat DevTools',
          accelerator: 'F12',
          click: () => {
            if (chatView && chatView.webContents) {
              if (chatView.webContents.isDevToolsOpened()) {
                chatView.webContents.closeDevTools();
              } else {
                chatView.webContents.openDevTools({ mode: 'detach' });
              }
            }
          }
        },
        {
          label: 'Toggle Content DevTools',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            if (activeTabId) {
              const view = contentViews.get(activeTabId);
              if (view && view.webContents) {
                if (view.webContents.isDevToolsOpened()) {
                  view.webContents.closeDevTools();
                } else {
                  view.webContents.openDevTools({ mode: 'detach' });
                }
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Reload Chat UI',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (chatView && chatView.webContents) {
              chatView.webContents.reload();
            }
          }
        },
        {
          label: 'Reload Content Tab',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (activeTabId) {
              const view = contentViews.get(activeTabId);
              if (view && view.webContents) {
                view.webContents.reload();
              }
            }
          }
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/liuyipei/llm-dom-browser');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create and return the main application window with WebContentsView architecture
 */
function createWindow() {
  // Create custom application menu
  createApplicationMenu();

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

  mainWindow.contentView.addChildView(chatView);

  // Load chat UI - in production this would be a built React app
  // For now, we'll load a simple HTML file
  const chatUIPath = path.join(__dirname, 'ui', 'chat.html');
  chatView.webContents.loadFile(chatUIPath).catch(err => {
    console.error('Failed to load chat UI:', err);
    // Fallback to data URL if file not found
    chatView.webContents.loadURL('data:text/html,<h1>Chat UI Loading...</h1>');
  });

  // Set initial bounds for views
  updateViewBounds();

  // Add resize event listener to dynamically update view bounds
  mainWindow.on('resize', () => {
    updateViewBounds();
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

      mainWindow.contentView.addChildView(contentView);

      const tabId = generateId();
      contentViews.set(tabId, contentView);

      // Set bounds based on current window size
      // Use exact width - scrollbar will render within this space
      // Add +2px to height to prevent bottom clipping
      const bounds = mainWindow.getBounds();
      contentView.setBounds({ x: chatWidth, y: 0, width: bounds.width - chatWidth, height: bounds.height + 2 });

      // Listen for various load events to help debug loading issues
      contentView.webContents.on('did-start-loading', () => {
        console.log(`Tab ${tabId} started loading: ${url}`);
      });

      contentView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Tab ${tabId} failed to load: ${errorDescription} (${errorCode}) - ${validatedURL}`);
      });

      // Listen for page load completion to update title
      contentView.webContents.on('did-finish-load', () => {
        const title = contentView.webContents.getTitle();
        const currentUrl = contentView.webContents.getURL();
        console.log(`Tab ${tabId} finished loading: ${title} (URL: ${currentUrl})`);

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

      // Listen for page finish loading (after all CSS/JS loaded)
      contentView.webContents.on('did-finish-load', async () => {
        const title = contentView.webContents.getTitle();
        console.log(`Tab ${tabId} finished loading: ${title} - injecting scrollbar CSS`);

        try {
          // Inject scrollbar CSS directly using executeJavaScript
          // This ensures it's added AFTER all page CSS and has highest priority
          await contentView.webContents.executeJavaScript(`
            (function() {
              // Remove any existing injected style
              const existingStyle = document.getElementById('llm-browser-scrollbar-style');
              if (existingStyle) existingStyle.remove();

              // Create and inject new style element
              const style = document.createElement('style');
              style.id = 'llm-browser-scrollbar-style';
              style.textContent = \`
                /* Force scrollbars to be visible with better styling */
                ::-webkit-scrollbar {
                  width: 16px !important;
                  height: 16px !important;
                }

                ::-webkit-scrollbar-track {
                  background: #e0e0e0 !important;
                  border-left: 2px solid #ccc !important;
                }

                ::-webkit-scrollbar-thumb {
                  background: #666 !important;
                  border: 4px solid #e0e0e0 !important;
                  min-height: 40px !important;
                }

                ::-webkit-scrollbar-thumb:hover {
                  background: #444 !important;
                }

                ::-webkit-scrollbar-corner {
                  background: #e0e0e0 !important;
                }

                /* Force scrollbar to always show and reserve space for it */
                html {
                  overflow-y: scroll !important;
                  overflow-x: auto !important;
                  scrollbar-gutter: stable !important;
                }

                body {
                  overflow: visible !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  min-height: 100vh !important;
                }
              \`;

              document.head.appendChild(style);
              console.log('✓ Scrollbar CSS injected successfully');
              return true;
            })();
          `);
          console.log(`Tab ${tabId}: CSS injection completed`);
        } catch (err) {
          console.error(`Tab ${tabId}: Failed to inject scrollbar CSS:`, err);
        }
      });

      // Load the URL or PDF
      await contentView.webContents.loadURL(url);

      // Set as active tab if it's the first tab
      if (!activeTabId) {
        activeTabId = tabId;
        if (chatView && chatView.webContents) {
          chatView.webContents.send('active-tab-changed', { tabId });
        }
      }

      // Get the current title (which might have already been set by events that fired during load)
      const currentTitle = contentView.webContents.getTitle();

      console.log(`Opened tab ${tabId} with URL: ${url}, initial title: ${currentTitle}`);
      return { id: tabId, url, title: currentTitle, isActive: tabId === activeTabId };
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

        // If closing active tab, switch to another tab or clear activeTabId
        if (activeTabId === tabId) {
          const remainingTabs = Array.from(contentViews.keys());
          if (remainingTabs.length > 0) {
            // Switch to the first remaining tab
            const newActiveTabId = remainingTabs[0];
            activeTabId = newActiveTabId;
            if (chatView && chatView.webContents) {
              chatView.webContents.send('active-tab-changed', { tabId: newActiveTabId });
            }
          } else {
            activeTabId = null;
          }
        }

        console.log(`Closed tab ${tabId}`);
        return { success: true };
      }
      return { success: false, error: 'Tab not found' };
    } catch (error) {
      console.error('Error closing tab:', error);
      throw error;
    }
  });

  // Handle IPC: Switch to a different tab
  ipcMain.handle('switch-tab', (event, tabId) => {
    try {
      const view = contentViews.get(tabId);
      if (!view) {
        return { success: false, error: 'Tab not found' };
      }

      // Remove and re-add the view to bring it to front
      // This is necessary because WebContentsView doesn't have a built-in z-index or bringToFront method
      mainWindow.contentView.removeChildView(view);
      mainWindow.contentView.addChildView(view);

      // Set bounds based on current window size
      // Use exact width - scrollbar will render within this space
      // Add +2px to height to prevent bottom clipping
      const bounds = mainWindow.getBounds();
      const chatWidth = 400;
      view.setBounds({ x: chatWidth, y: 0, width: bounds.width - chatWidth, height: bounds.height + 2 });

      // Update active tab tracking
      activeTabId = tabId;

      // Notify chat UI of the change
      if (chatView && chatView.webContents) {
        chatView.webContents.send('active-tab-changed', { tabId });
      }

      console.log(`Switched to tab ${tabId}`);
      return { success: true, tabId };
    } catch (error) {
      console.error('Error switching tab:', error);
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
  ipcMain.handle('query-llm', async (event, { query, tabIds, apiKey, provider, model, includeMedia, customEndpoint }) => {
    try {
      return await llmOrchestrator.analyzeContent(query, tabIds, apiKey, provider, model, includeMedia, customEndpoint);
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

  // Handle IPC: Update chat width (for resizable split)
  ipcMain.handle('update-chat-width', (event, newWidth) => {
    try {
      // Constrain width to reasonable bounds (200px min, 80% of window max)
      const bounds = mainWindow.getBounds();
      const minWidth = 200;
      const maxWidth = Math.floor(bounds.width * 0.8);

      chatWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      updateViewBounds();

      return { success: true, chatWidth };
    } catch (error) {
      console.error('Error updating chat width:', error);
      return { success: false, error: error.message };
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
      // Check if mainWindow and its contentView still exist before cleanup
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.contentView) {
        mainWindow.contentView.removeChildView(view);
      }
      // Check if view's webContents is not already destroyed
      if (view && view.webContents && !view.webContents.isDestroyed()) {
        view.webContents.destroy();
      }
    } catch (err) {
      console.error(`Error cleaning up view ${tabId}:`, err);
    }
  });
  contentViews.clear();
});

console.log('LLM-DOM-Browser Main Process Started');

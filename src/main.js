const { app } = require('electron');
const PDFService = require('./services/pdf-service');
const LLMOrchestrator = require('./services/llm-orchestrator');
const SessionManager = require('./session-manager');
const WindowManager = require('./window-manager');
const TabManager = require('./tab-manager');
const MenuBuilder = require('./menu-builder');
const IPCHandlers = require('./ipc-handlers');

// Disable overlay scrollbars to ensure classic scrollbars are always visible
// This must be set before app.whenReady()
app.commandLine.appendSwitch('disable-features', 'OverlayScrollbar');

// Shared state
const contentViews = new Map();
const llmOrchestrator = new LLMOrchestrator();
const pdfService = new PDFService();

// Managers
const sessionManager = new SessionManager();
const windowManager = new WindowManager({
  contentViews,
  sessionManager
});
const tabManager = new TabManager({
  contentViews
});
const menuBuilder = new MenuBuilder();
const ipcHandlers = new IPCHandlers({
  contentViews,
  llmOrchestrator,
  pdfService
});

/**
 * Create and return the main application window with WebContentsView architecture
 */
function createWindow() {
  // Initialize session
  sessionManager.initialize();

  // Create window
  const mainWindow = windowManager.createWindow();
  const chatView = windowManager.getChatView();

  // Update managers with window/view references
  tabManager.updateReferences({
    mainWindow,
    chatView,
    updateViewBounds: () => windowManager.updateViewBounds()
  });

  menuBuilder.updateReferences({
    mainWindow,
    chatView,
    contentViews,
    tabManager
  });

  ipcHandlers.updateReferences({
    tabManager,
    windowManager
  });

  // Create custom application menu
  menuBuilder.createMenu();

  // Register the content views map with the LLM orchestrator
  llmOrchestrator.setContentViews(contentViews);

  // Register the tab manager with the LLM orchestrator (for accessing file metadata)
  llmOrchestrator.setTabManager(tabManager);

  // Register the window manager with the LLM orchestrator (for accessing UI tab data)
  llmOrchestrator.setWindowManager(windowManager);

  // Register all IPC handlers
  ipcHandlers.registerAll();

  // Show window
  windowManager.show();

  // Load default homepage
  tabManager.openTab('https://www.google.com');
}

// App event handlers
app.whenReady().then(() => {
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
  if (windowManager.isDestroyed()) {
    createWindow();
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  tabManager.cleanup();
});

console.log('LLM-DOM-Browser Main Process Started');

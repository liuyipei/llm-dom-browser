const { BaseWindow, WebContentsView } = require('electron');
const path = require('path');

/**
 * Window Manager - Manages main window and view bounds
 */
class WindowManager {
  constructor(options = {}) {
    this.mainWindow = null;
    this.chatView = null;
    this.contentViews = options.contentViews || new Map();
    this.sessionManager = options.sessionManager;
    this.chatWidth = 400; // Default chat sidebar width, can be adjusted by user
    this.SPLITTER_WIDTH = 5; // Width of the resizer/splitter
  }

  /**
   * Update all view bounds based on current window size
   * Uses DPI-safe rounding to avoid scrollbar clipping on Windows
   */
  updateViewBounds() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    // Use getContentBounds() to exclude window frame (critical for Windows)
    const { width, height } = this.mainWindow.getContentBounds();

    // Round chat width only, give remainder to content view (DPI-safe)
    const leftWidth = Math.round(this.chatWidth);
    const rightWidth = width - leftWidth; // Guaranteed to consume all remaining pixels

    // Update chat view bounds
    if (this.chatView && !this.chatView.webContents.isDestroyed()) {
      this.chatView.setBounds({ x: 0, y: 0, width: leftWidth, height });
    }

    // Update all content view bounds
    // rightWidth includes any rounding remainder, preventing scrollbar clipping
    this.contentViews.forEach((view, tabId) => {
      if (view && !view.webContents.isDestroyed()) {
        view.setBounds({ x: leftWidth, y: 0, width: rightWidth, height });
      }
    });
  }

  /**
   * Create the main application window
   */
  createWindow() {
    // Main window using BaseWindow (not BrowserWindow)
    this.mainWindow = new BaseWindow({
      width: 1400,
      height: 900,
      show: false
    });

    // Create chat UI view (left sidebar)
    // Use persistent session to enable localStorage persistence
    const persistentSession = this.sessionManager ? this.sessionManager.getSession() : null;

    this.chatView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload', 'chat-preload.js'),
        sandbox: true,
        session: persistentSession
      }
    });

    this.mainWindow.contentView.addChildView(this.chatView);

    // Load chat UI - in production this would be a built React app
    // For now, we'll load a simple HTML file
    const chatUIPath = path.join(__dirname, 'ui', 'chat.html');
    this.chatView.webContents.loadFile(chatUIPath).catch(err => {
      console.error('Failed to load chat UI:', err);
      // Fallback to data URL if file not found
      this.chatView.webContents.loadURL('data:text/html,<h1>Chat UI Loading...</h1>');
    });

    // Set initial bounds for views
    this.updateViewBounds();

    // Add event listeners for all layout changes (Windows DPI-safe)
    this.mainWindow.on('resize', () => this.updateViewBounds());
    this.mainWindow.on('maximize', () => this.updateViewBounds());
    this.mainWindow.on('unmaximize', () => this.updateViewBounds());
    this.mainWindow.on('enter-full-screen', () => this.updateViewBounds());
    this.mainWindow.on('leave-full-screen', () => this.updateViewBounds());

    return this.mainWindow;
  }

  /**
   * Update chat width (for resizable split)
   */
  updateChatWidth(newWidth) {
    try {
      // Constrain width to reasonable bounds (200px min, 80% of window max)
      const { width } = this.mainWindow.getContentBounds();
      const minWidth = 200;
      const maxWidth = Math.floor(width * 0.8);

      this.chatWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      this.updateViewBounds();

      return { success: true, chatWidth: this.chatWidth };
    } catch (error) {
      console.error('Error updating chat width:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Show the main window
   */
  show() {
    if (this.mainWindow) {
      this.mainWindow.show();
    }
  }

  /**
   * Get the main window instance
   */
  getWindow() {
    return this.mainWindow;
  }

  /**
   * Get the chat view instance
   */
  getChatView() {
    return this.chatView;
  }

  /**
   * Check if window is destroyed
   */
  isDestroyed() {
    return !this.mainWindow || this.mainWindow.isDestroyed();
  }
}

module.exports = WindowManager;

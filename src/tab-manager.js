const { WebContentsView } = require('electron');
const path = require('path');
const { generateId } = require('./utils');

/**
 * Tab Manager - Handles tab lifecycle operations
 */
class TabManager {
  constructor(options = {}) {
    this.mainWindow = options.mainWindow;
    this.chatView = options.chatView;
    this.contentViews = options.contentViews || new Map();
    this.activeTabId = null;
    this.updateViewBounds = options.updateViewBounds;
  }

  /**
   * Update manager references (called when dependencies change)
   */
  updateReferences(options = {}) {
    if (options.mainWindow) this.mainWindow = options.mainWindow;
    if (options.chatView) this.chatView = options.chatView;
    if (options.contentViews) this.contentViews = options.contentViews;
    if (options.updateViewBounds) this.updateViewBounds = options.updateViewBounds;
  }

  /**
   * Get the currently active tab ID
   */
  getActiveTabId() {
    return this.activeTabId;
  }

  /**
   * Set the active tab ID
   */
  setActiveTabId(tabId) {
    this.activeTabId = tabId;
  }

  /**
   * Open a new tab with the given URL
   */
  async openTab(url) {
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

      this.mainWindow.contentView.addChildView(contentView);

      const tabId = generateId();
      this.contentViews.set(tabId, contentView);

      // Set bounds using DPI-safe layout function
      if (this.updateViewBounds) {
        this.updateViewBounds();
      }

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
        if (this.chatView && this.chatView.webContents) {
          this.chatView.webContents.send('tab-title-updated', { tabId, title });
        }
      });

      // Also listen for explicit title updates (some sites update title after load)
      contentView.webContents.on('page-title-updated', (event, title) => {
        console.log(`Tab ${tabId} title updated: ${title}`);

        // Send title update to chat UI
        if (this.chatView && this.chatView.webContents) {
          this.chatView.webContents.send('tab-title-updated', { tabId, title });
        }
      });

      // Listen for DOM ready (fires before did-finish-load)
      contentView.webContents.on('dom-ready', () => {
        const title = contentView.webContents.getTitle();
        console.log(`Tab ${tabId} DOM ready: ${title}`);
      });

      // Load the URL or PDF
      await contentView.webContents.loadURL(url);

      // Set as active tab if it's the first tab
      if (!this.activeTabId) {
        this.activeTabId = tabId;
        if (this.chatView && this.chatView.webContents) {
          this.chatView.webContents.send('active-tab-changed', { tabId });
        }
      }

      // Get the current title (which might have already been set by events that fired during load)
      const currentTitle = contentView.webContents.getTitle();

      console.log(`Opened tab ${tabId} with URL: ${url}, initial title: ${currentTitle}`);
      return { id: tabId, url, title: currentTitle, isActive: tabId === this.activeTabId };
    } catch (error) {
      console.error('Error opening tab:', error);
      throw error;
    }
  }

  /**
   * Close a tab by ID
   */
  closeTab(tabId) {
    try {
      // If no tabId provided, use active tab
      const targetTabId = tabId || this.activeTabId;

      if (!targetTabId) {
        return { success: false, error: 'No tab to close' };
      }

      const view = this.contentViews.get(targetTabId);
      if (view) {
        this.mainWindow.contentView.removeChildView(view);
        view.webContents.destroy();
        this.contentViews.delete(targetTabId);

        // If closing active tab, switch to another tab or clear activeTabId
        if (this.activeTabId === targetTabId) {
          const remainingTabs = Array.from(this.contentViews.keys());
          if (remainingTabs.length > 0) {
            // Switch to the first remaining tab
            const newActiveTabId = remainingTabs[0];
            this.activeTabId = newActiveTabId;
            if (this.chatView && this.chatView.webContents) {
              this.chatView.webContents.send('active-tab-changed', { tabId: newActiveTabId });
            }
          } else {
            this.activeTabId = null;
          }
        }

        console.log(`Closed tab ${targetTabId}`);
        return { success: true };
      }
      return { success: false, error: 'Tab not found' };
    } catch (error) {
      console.error('Error closing tab:', error);
      throw error;
    }
  }

  /**
   * Switch to a different tab
   */
  switchTab(tabId) {
    try {
      const view = this.contentViews.get(tabId);
      if (!view) {
        return { success: false, error: 'Tab not found' };
      }

      // Remove and re-add the view to bring it to front
      // This is necessary because WebContentsView doesn't have a built-in z-index or bringToFront method
      this.mainWindow.contentView.removeChildView(view);
      this.mainWindow.contentView.addChildView(view);

      // Set bounds using DPI-safe layout function
      if (this.updateViewBounds) {
        this.updateViewBounds();
      }

      // Update active tab tracking
      this.activeTabId = tabId;

      // Notify chat UI of the change
      if (this.chatView && this.chatView.webContents) {
        this.chatView.webContents.send('active-tab-changed', { tabId });
      }

      console.log(`Switched to tab ${tabId}`);
      return { success: true, tabId };
    } catch (error) {
      console.error('Error switching tab:', error);
      throw error;
    }
  }

  /**
   * Get all tabs
   */
  getAllTabs() {
    return Array.from(this.contentViews.keys());
  }

  /**
   * Clean up all tabs (called on app quit)
   */
  cleanup() {
    this.contentViews.forEach((view, tabId) => {
      try {
        // Check if mainWindow and its contentView still exist before cleanup
        if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.contentView) {
          this.mainWindow.contentView.removeChildView(view);
        }
        // Check if view's webContents is not already destroyed
        if (view && view.webContents && !view.webContents.isDestroyed()) {
          view.webContents.destroy();
        }
      } catch (err) {
        console.error(`Error cleaning up view ${tabId}:`, err);
      }
    });
    this.contentViews.clear();
    this.activeTabId = null;
  }
}

module.exports = TabManager;

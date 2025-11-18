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
    this.closedTabs = []; // Track recently closed tabs for reopen functionality
    this.maxClosedTabs = 10; // Limit history size
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
   * @param {string} url - The URL to open
   * @param {Object} options - Options for opening the tab
   * @param {boolean} options.activate - Whether to switch to the new tab (default: true)
   */
  async openTab(url, options = {}) {
    try {
      const { activate = true } = options;

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

      // Handle Ctrl+Click, Cmd+Click, Shift+Click to open links in new tabs
      contentView.webContents.setWindowOpenHandler(({ url, frameName, features, disposition }) => {
        console.log(`[Tab Handler] Window open request - URL: ${url}, disposition: ${disposition}, features: ${features}`);

        // disposition can be: 'foreground-tab', 'background-tab', 'new-window', etc.
        // Ctrl/Cmd+Click creates 'background-tab', Shift+Click creates 'foreground-tab'
        const shouldActivate = disposition === 'foreground-tab';

        // Create a new tab without blocking
        this.openTab(url, { activate: shouldActivate }).catch(error => {
          console.error(`[Tab Handler] Failed to open new tab: ${error.message}`);
        });

        // Deny the request to prevent current tab navigation
        return { action: 'deny' };
      });

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
      // Don't await - let event handlers track the load status
      // This prevents ERR_ABORTED errors from blocking tab creation
      contentView.webContents.loadURL(url).catch((error) => {
        console.error(`Tab ${tabId} navigation error: ${error.message}`);
        // Error is already logged by did-fail-load handler
        // Tab is still created and user can retry
      });

      // Determine if we should activate this tab
      const shouldActivate = !this.activeTabId || activate;

      // Set as active tab if it's the first tab or activation is requested
      if (shouldActivate) {
        this.activeTabId = tabId;
        if (this.chatView && this.chatView.webContents) {
          this.chatView.webContents.send('active-tab-changed', { tabId });
        }
      }

      // Get the current title (might be empty if page hasn't loaded yet)
      const currentTitle = contentView.webContents.getTitle();

      console.log(`Opened tab ${tabId} with URL: ${url}, initial title: ${currentTitle}, activated: ${shouldActivate}`);
      return { id: tabId, url, title: currentTitle || 'Loading...', isActive: tabId === this.activeTabId };
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
        // Store tab info for reopen functionality
        const url = view.webContents.getURL();
        const title = view.webContents.getTitle();
        this.closedTabs.push({ url, title, timestamp: Date.now() });

        // Limit history size
        if (this.closedTabs.length > this.maxClosedTabs) {
          this.closedTabs.shift();
        }

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
   * Get all tabs with their full information (id, url, title, isActive)
   */
  getAllTabsInfo() {
    const tabsInfo = [];
    for (const [tabId, contentView] of this.contentViews.entries()) {
      tabsInfo.push({
        id: tabId,
        url: contentView.webContents.getURL(),
        title: contentView.webContents.getTitle(),
        isActive: tabId === this.activeTabId
      });
    }
    return tabsInfo;
  }

  /**
   * Navigate to the next tab
   */
  nextTab() {
    const tabs = this.getAllTabs();
    if (tabs.length <= 1) {
      return { success: false, error: 'Not enough tabs' };
    }

    const currentIndex = tabs.indexOf(this.activeTabId);
    const nextIndex = (currentIndex + 1) % tabs.length;
    const nextTabId = tabs[nextIndex];

    return this.switchTab(nextTabId);
  }

  /**
   * Navigate to the previous tab
   */
  previousTab() {
    const tabs = this.getAllTabs();
    if (tabs.length <= 1) {
      return { success: false, error: 'Not enough tabs' };
    }

    const currentIndex = tabs.indexOf(this.activeTabId);
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    const prevTabId = tabs[prevIndex];

    return this.switchTab(prevTabId);
  }

  /**
   * Jump to a specific tab by index (1-based)
   */
  jumpToTab(index) {
    const tabs = this.getAllTabs();

    // Convert 1-based to 0-based index
    const arrayIndex = index - 1;

    if (arrayIndex < 0 || arrayIndex >= tabs.length) {
      return { success: false, error: 'Tab index out of range' };
    }

    const tabId = tabs[arrayIndex];
    return this.switchTab(tabId);
  }

  /**
   * Reopen the last closed tab
   */
  async reopenLastClosedTab() {
    if (this.closedTabs.length === 0) {
      return { success: false, error: 'No closed tabs to reopen' };
    }

    const lastClosed = this.closedTabs.pop();
    try {
      const result = await this.openTab(lastClosed.url);
      console.log(`Reopened tab: ${lastClosed.url}`);
      return { success: true, ...result };
    } catch (error) {
      console.error('Error reopening tab:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Navigate back in the active tab's history
   */
  goBack() {
    if (!this.activeTabId) {
      return { success: false, error: 'No active tab' };
    }

    const view = this.contentViews.get(this.activeTabId);
    if (view && view.webContents && view.webContents.canGoBack()) {
      view.webContents.goBack();
      console.log(`Navigated back in tab ${this.activeTabId}`);
      return { success: true };
    }

    return { success: false, error: 'Cannot go back' };
  }

  /**
   * Navigate forward in the active tab's history
   */
  goForward() {
    if (!this.activeTabId) {
      return { success: false, error: 'No active tab' };
    }

    const view = this.contentViews.get(this.activeTabId);
    if (view && view.webContents && view.webContents.canGoForward()) {
      view.webContents.goForward();
      console.log(`Navigated forward in tab ${this.activeTabId}`);
      return { success: true };
    }

    return { success: false, error: 'Cannot go forward' };
  }

  /**
   * Stop loading the active tab
   */
  stopLoading() {
    if (!this.activeTabId) {
      return { success: false, error: 'No active tab' };
    }

    const view = this.contentViews.get(this.activeTabId);
    if (view && view.webContents) {
      view.webContents.stop();
      console.log(`Stopped loading tab ${this.activeTabId}`);
      return { success: true };
    }

    return { success: false, error: 'No active tab found' };
  }

  /**
   * Reload the active tab (with optional cache bypass)
   */
  reloadTab(ignoreCached = false) {
    if (!this.activeTabId) {
      return { success: false, error: 'No active tab' };
    }

    const view = this.contentViews.get(this.activeTabId);
    if (view && view.webContents) {
      if (ignoreCached) {
        view.webContents.reloadIgnoringCache();
        console.log(`Hard reloaded tab ${this.activeTabId}`);
      } else {
        view.webContents.reload();
        console.log(`Reloaded tab ${this.activeTabId}`);
      }
      return { success: true };
    }

    return { success: false, error: 'No active tab found' };
  }

  /**
   * Clean up all tabs (called on app quit)
   */
  cleanup() {
    this.contentViews.forEach((view, tabId) => {
      try {
        this._cleanupView(view, tabId);
      } catch (err) {
        console.error(`Error cleaning up view ${tabId}:`, err);
      }
    });
    this.contentViews.clear();
    this.activeTabId = null;
  }

  /**
   * Clean up a single view
   */
  _cleanupView(view, tabId) {
    const hasMainWindow = this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.contentView;
    if (hasMainWindow) {
      this.mainWindow.contentView.removeChildView(view);
    }

    const hasWebContents = view && view.webContents && !view.webContents.isDestroyed();
    if (hasWebContents) {
      view.webContents.destroy();
    }
  }
}

module.exports = TabManager;

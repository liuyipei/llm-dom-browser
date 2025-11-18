/**
 * View Helper Utilities
 * Common patterns for working with WebContentsView and tab management
 */

/**
 * Get the active view from tab manager and content views
 * @param {TabManager} tabManager - The tab manager instance
 * @param {Map} contentViews - Map of tabId -> WebContentsView
 * @returns {Object|null} - { tabId, view } or null if not found
 */
function getActiveView(tabManager, contentViews) {
  if (!tabManager) {
    return null;
  }

  const activeTabId = tabManager.getActiveTabId();
  if (!activeTabId) {
    return null;
  }

  const view = contentViews.get(activeTabId);
  if (!view) {
    return null;
  }

  return { tabId: activeTabId, view };
}

/**
 * Get a specific view by tab ID with validation
 * @param {string} tabId - The tab ID
 * @param {Map} contentViews - Map of tabId -> WebContentsView
 * @returns {Object|null} - { success, view?, error? }
 */
function getViewById(tabId, contentViews) {
  if (!tabId) {
    return { success: false, error: 'No tab ID provided' };
  }

  const view = contentViews.get(tabId);
  if (!view) {
    return { success: false, error: 'Tab not found' };
  }

  return { success: true, view };
}

/**
 * Check if a view's webContents can navigate back
 * @param {WebContentsView} view - The view to check
 * @returns {boolean}
 */
function canNavigateBack(view) {
  return view && view.webContents && view.webContents.canGoBack();
}

/**
 * Check if a view's webContents can navigate forward
 * @param {WebContentsView} view - The view to check
 * @returns {boolean}
 */
function canNavigateForward(view) {
  return view && view.webContents && view.webContents.canGoForward();
}

/**
 * Execute JavaScript in a view's webContents safely
 * @param {WebContentsView} view - The view
 * @param {string} code - JavaScript code to execute
 * @returns {Promise<any>} - Result of execution
 */
async function executeInView(view, code) {
  if (!view || !view.webContents) {
    throw new Error('Invalid view or webContents');
  }
  return await view.webContents.executeJavaScript(code);
}

/**
 * Send IPC message to a view's webContents
 * @param {WebContentsView} view - The view
 * @param {string} channel - IPC channel name
 * @param {any} data - Data to send
 * @returns {boolean} - True if sent successfully
 */
function sendToView(view, channel, data) {
  if (!view || !view.webContents) {
    return false;
  }
  view.webContents.send(channel, data);
  return true;
}

module.exports = {
  getActiveView,
  getViewById,
  canNavigateBack,
  canNavigateForward,
  executeInView,
  sendToView
};

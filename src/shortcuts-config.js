/**
 * Keyboard shortcuts configuration
 * Centralized keyboard shortcuts for consistent UX across platforms
 */

/**
 * Get keyboard shortcuts configuration
 * @param {boolean} isMac - Whether running on macOS
 * @returns {Object} Shortcuts configuration
 */
function getShortcuts(isMac = false) {
  return {
    // File operations
    newTab: 'CmdOrCtrl+T',
    closeTab: 'CmdOrCtrl+W',
    reopenTab: 'CmdOrCtrl+Shift+T',
    closeWindow: 'CmdOrCtrl+Shift+W',
    quit: isMac ? null : 'Ctrl+Q',
    bookmark: 'CmdOrCtrl+D',

    // Tab navigation
    nextTab: isMac ? 'Cmd+Option+Right' : 'Ctrl+Tab',
    previousTab: isMac ? 'Cmd+Option+Left' : 'Ctrl+Shift+Tab',
    jumpToTab: (n) => `CmdOrCtrl+${n}`, // 1-9

    // Page navigation
    back: isMac ? 'Cmd+[' : 'Alt+Left',
    forward: isMac ? 'Cmd+]' : 'Alt+Right',
    reload: isMac ? 'Cmd+R' : 'F5',
    hardReload: 'CmdOrCtrl+Shift+R',
    stop: isMac ? 'Cmd+.' : 'Esc',
    focusAddressBar: 'CmdOrCtrl+L',

    // Search
    find: 'CmdOrCtrl+F',
    findNext: isMac ? 'Cmd+G' : 'F3',

    // Developer tools
    devTools: isMac ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
    chatDevTools: 'F12',

    // View
    zoomIn: 'CmdOrCtrl+Plus',
    zoomOut: 'CmdOrCtrl+-',
    actualSize: 'CmdOrCtrl+0'
  };
}

module.exports = {
  getShortcuts
};

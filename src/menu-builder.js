const { app, Menu } = require('electron');

/**
 * Menu Builder - Creates and manages application menu
 */
class MenuBuilder {
  constructor(options = {}) {
    this.chatView = options.chatView;
    this.contentViews = options.contentViews;
    this.mainWindow = options.mainWindow;
    this.tabManager = options.tabManager;
  }

  /**
   * Update menu references (called when views/window change)
   */
  updateReferences(options = {}) {
    if (options.chatView) this.chatView = options.chatView;
    if (options.contentViews) this.contentViews = options.contentViews;
    if (options.mainWindow) this.mainWindow = options.mainWindow;
    if (options.tabManager) this.tabManager = options.tabManager;
  }

  /**
   * Create custom application menu
   */
  createMenu() {
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
              if (this.chatView && this.chatView.webContents) {
                this.chatView.webContents.executeJavaScript(`
                  document.getElementById('urlInput')?.focus();
                `);
              }
            }
          },
          {
            label: 'Close Tab',
            accelerator: 'CmdOrCtrl+W',
            click: () => {
              if (this.tabManager) {
                this.tabManager.closeTab();
              }
            }
          },
          {
            label: 'Reopen Last Closed Tab',
            accelerator: 'CmdOrCtrl+Shift+T',
            click: async () => {
              if (this.tabManager) {
                await this.tabManager.reopenLastClosedTab();
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Close Window',
            accelerator: 'CmdOrCtrl+Shift+W',
            role: 'close'
          },
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
      // Tabs menu
      {
        label: 'Tabs',
        submenu: [
          {
            label: 'Next Tab',
            accelerator: isMac ? 'Cmd+Alt+Right' : 'Ctrl+Tab',
            click: () => {
              if (this.tabManager) {
                const nextTabId = this.tabManager.getNextTabId();
                if (nextTabId) this.tabManager.switchTab(nextTabId);
              }
            }
          },
          {
            label: 'Previous Tab',
            accelerator: isMac ? 'Cmd+Alt+Left' : 'Ctrl+Shift+Tab',
            click: () => {
              if (this.tabManager) {
                const prevTabId = this.tabManager.getPreviousTabId();
                if (prevTabId) this.tabManager.switchTab(prevTabId);
              }
            }
          },
          { type: 'separator' },
          ...Array.from({ length: 8 }, (_, i) => ({
            label: `Jump to Tab ${i + 1}`,
            accelerator: `CmdOrCtrl+${i + 1}`,
            click: () => {
              if (this.tabManager) {
                const tabId = this.tabManager.getTabByIndex(i);
                if (tabId) this.tabManager.switchTab(tabId);
              }
            }
          })),
          {
            label: 'Jump to Last Tab',
            accelerator: 'CmdOrCtrl+9',
            click: () => {
              if (this.tabManager) {
                const tabs = this.tabManager.getAllTabs();
                if (tabs.length > 0) {
                  const lastTabId = tabs[tabs.length - 1];
                  this.tabManager.switchTab(lastTabId);
                }
              }
            }
          }
        ]
      },
      // View menu
      {
        label: 'View',
        submenu: [
          {
            label: 'Back',
            accelerator: isMac ? 'Cmd+[' : 'Alt+Left',
            click: () => {
              if (this.tabManager) {
                const activeTabId = this.tabManager.getActiveTabId();
                if (activeTabId && this.contentViews) {
                  const view = this.contentViews.get(activeTabId);
                  if (view && view.webContents.canGoBack()) {
                    view.webContents.goBack();
                  }
                }
              }
            }
          },
          {
            label: 'Forward',
            accelerator: isMac ? 'Cmd+]' : 'Alt+Right',
            click: () => {
              if (this.tabManager) {
                const activeTabId = this.tabManager.getActiveTabId();
                if (activeTabId && this.contentViews) {
                  const view = this.contentViews.get(activeTabId);
                  if (view && view.webContents.canGoForward()) {
                    view.webContents.goForward();
                  }
                }
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: isMac ? 'CmdOrCtrl+R' : 'F5',
            click: () => {
              if (this.tabManager) {
                const activeTabId = this.tabManager.getActiveTabId();
                if (activeTabId && this.contentViews) {
                  const view = this.contentViews.get(activeTabId);
                  if (view && view.webContents) {
                    view.webContents.reload();
                  }
                }
              }
            }
          },
          {
            label: 'Hard Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
              if (this.tabManager) {
                const activeTabId = this.tabManager.getActiveTabId();
                if (activeTabId && this.contentViews) {
                  const view = this.contentViews.get(activeTabId);
                  if (view && view.webContents) {
                    view.webContents.reloadIgnoringCache();
                  }
                }
              }
            }
          },
          {
            label: 'Stop Loading',
            accelerator: isMac ? 'Cmd+.' : 'Esc',
            click: () => {
              if (this.tabManager) {
                const activeTabId = this.tabManager.getActiveTabId();
                if (activeTabId && this.contentViews) {
                  const view = this.contentViews.get(activeTabId);
                  if (view && view.webContents) {
                    view.webContents.stop();
                  }
                }
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Find',
            accelerator: 'CmdOrCtrl+F',
            click: () => {
              if (this.tabManager) {
                const activeTabId = this.tabManager.getActiveTabId();
                if (activeTabId && this.contentViews) {
                  const view = this.contentViews.get(activeTabId);
                  if (view && view.webContents) {
                    view.webContents.executeJavaScript(`
                      if (window.find) window.find();
                    `);
                  }
                }
              }
            }
          },
          {
            label: 'Focus Address Bar',
            accelerator: 'CmdOrCtrl+L',
            click: () => {
              if (this.chatView && this.chatView.webContents) {
                this.chatView.webContents.executeJavaScript(`
                  const urlInput = document.getElementById('urlInput');
                  if (urlInput) {
                    urlInput.focus();
                    urlInput.select();
                  }
                `);
              }
            }
          },
          { type: 'separator' },
          { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
          { role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
          { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
          { type: 'separator' },
          {
            label: 'Toggle Chat DevTools',
            accelerator: 'F12',
            click: () => {
              if (this.chatView && this.chatView.webContents) {
                if (this.chatView.webContents.isDevToolsOpened()) {
                  this.chatView.webContents.closeDevTools();
                } else {
                  this.chatView.webContents.openDevTools({ mode: 'detach' });
                }
              }
            }
          },
          {
            label: 'Toggle Content DevTools',
            accelerator: 'CmdOrCtrl+Alt+I',
            click: () => {
              if (this.tabManager) {
                const activeTabId = this.tabManager.getActiveTabId();
                if (activeTabId && this.contentViews) {
                  const view = this.contentViews.get(activeTabId);
                  if (view && view.webContents) {
                    if (view.webContents.isDevToolsOpened()) {
                      view.webContents.closeDevTools();
                    } else {
                      view.webContents.openDevTools({ mode: 'detach' });
                    }
                  }
                }
              }
            }
          },
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
}

module.exports = MenuBuilder;

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
              // Focus URL input in chat view
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
              // Close active tab
              if (this.tabManager) {
                this.tabManager.closeTab();
              }
            }
          },
          {
            label: 'Reopen Closed Tab',
            accelerator: 'CmdOrCtrl+Shift+T',
            click: () => {
              if (this.tabManager) {
                this.tabManager.reopenLastClosedTab();
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Next Tab',
            accelerator: isMac ? 'Cmd+Option+Right' : 'Ctrl+Tab',
            click: () => {
              if (this.tabManager) {
                this.tabManager.nextTab();
              }
            }
          },
          {
            label: 'Previous Tab',
            accelerator: isMac ? 'Cmd+Option+Left' : 'Ctrl+Shift+Tab',
            click: () => {
              if (this.tabManager) {
                this.tabManager.previousTab();
              }
            }
          },
          { type: 'separator' },
          ...(Array.from({ length: 8 }, (_, i) => ({
            label: `Jump to Tab ${i + 1}`,
            accelerator: `CmdOrCtrl+${i + 1}`,
            click: () => {
              if (this.tabManager) {
                this.tabManager.jumpToTab(i + 1);
              }
            }
          }))),
          {
            label: 'Jump to Last Tab',
            accelerator: 'CmdOrCtrl+9',
            click: () => {
              if (this.tabManager) {
                const tabs = this.tabManager.getAllTabs();
                if (tabs.length > 0) {
                  this.tabManager.jumpToTab(tabs.length);
                }
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Close Window',
            accelerator: 'CmdOrCtrl+Shift+W',
            click: () => {
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.close();
              }
            }
          },
          isMac ? { role: 'close' } : { role: 'quit', accelerator: 'Ctrl+Q' }
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
          ]),
          { type: 'separator' },
          {
            label: 'Find...',
            accelerator: 'CmdOrCtrl+F',
            click: () => {
              const activeTabId = this.tabManager ? this.tabManager.getActiveTabId() : null;
              if (activeTabId && this.contentViews) {
                const view = this.contentViews.get(activeTabId);
                if (view && view.webContents) {
                  view.webContents.executeJavaScript(`
                    window.find();
                  `);
                }
              }
            }
          },
          {
            label: 'Find Next',
            accelerator: isMac ? 'Cmd+G' : 'F3',
            click: () => {
              const activeTabId = this.tabManager ? this.tabManager.getActiveTabId() : null;
              if (activeTabId && this.contentViews) {
                const view = this.contentViews.get(activeTabId);
                if (view && view.webContents) {
                  view.webContents.findInPage('', { forward: true, findNext: true });
                }
              }
            }
          }
        ]
      },
      // Navigation menu
      {
        label: 'Navigation',
        submenu: [
          {
            label: 'Back',
            accelerator: isMac ? 'Cmd+[' : 'Alt+Left',
            click: () => {
              if (this.tabManager) {
                this.tabManager.goBack();
              }
            }
          },
          {
            label: 'Forward',
            accelerator: isMac ? 'Cmd+]' : 'Alt+Right',
            click: () => {
              if (this.tabManager) {
                this.tabManager.goForward();
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: isMac ? 'Cmd+R' : 'F5',
            click: () => {
              if (this.tabManager) {
                this.tabManager.reloadTab(false);
              }
            }
          },
          {
            label: 'Hard Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
              if (this.tabManager) {
                this.tabManager.reloadTab(true);
              }
            }
          },
          {
            label: 'Stop',
            accelerator: isMac ? 'Cmd+.' : 'Esc',
            click: () => {
              if (this.tabManager) {
                this.tabManager.stopLoading();
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Focus Address Bar',
            accelerator: 'CmdOrCtrl+L',
            click: () => {
              if (this.chatView && this.chatView.webContents) {
                this.chatView.webContents.executeJavaScript(`
                  document.getElementById('urlInput')?.focus();
                  document.getElementById('urlInput')?.select();
                `);
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
            label: 'Developer Tools',
            accelerator: isMac ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
            click: () => {
              const activeTabId = this.tabManager ? this.tabManager.getActiveTabId() : null;
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
          },
          {
            label: 'Chat DevTools',
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
          { type: 'separator' },
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            role: 'zoomIn'
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            role: 'zoomOut'
          },
          {
            label: 'Actual Size',
            accelerator: 'CmdOrCtrl+0',
            role: 'resetZoom'
          },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      // Window menu
      {
        label: 'Window',
        submenu: [
          {
            label: 'Minimize',
            accelerator: isMac ? 'Cmd+M' : undefined,
            role: 'minimize'
          },
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

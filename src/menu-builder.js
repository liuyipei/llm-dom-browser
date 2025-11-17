const { app, Menu } = require('electron');

/**
 * Menu Builder - Creates and manages application menu
 */
class MenuBuilder {
  constructor(options = {}) {
    this.chatView = options.chatView;
    this.contentViews = options.contentViews;
    this.mainWindow = options.mainWindow;
    this.getActiveTabId = options.getActiveTabId;
    this.closeTab = options.closeTab;
  }

  /**
   * Update menu references (called when views/window change)
   */
  updateReferences(options = {}) {
    if (options.chatView) this.chatView = options.chatView;
    if (options.contentViews) this.contentViews = options.contentViews;
    if (options.mainWindow) this.mainWindow = options.mainWindow;
    if (options.getActiveTabId) this.getActiveTabId = options.getActiveTabId;
    if (options.closeTab) this.closeTab = options.closeTab;
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
              if (this.closeTab) {
                this.closeTab();
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
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => {
              const activeTabId = this.getActiveTabId ? this.getActiveTabId() : null;
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
          { type: 'separator' },
          {
            label: 'Reload Chat UI',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              if (this.chatView && this.chatView.webContents) {
                this.chatView.webContents.reload();
              }
            }
          },
          {
            label: 'Reload Content Tab',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => {
              const activeTabId = this.getActiveTabId ? this.getActiveTabId() : null;
              if (activeTabId && this.contentViews) {
                const view = this.contentViews.get(activeTabId);
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
}

module.exports = MenuBuilder;

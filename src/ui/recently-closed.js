/**
 * Recently closed tabs management
 * Handles showing and restoring recently closed tabs
 */

/**
 * Show recently closed tabs menu
 */
function showRecentlyClosedMenu() {
  if (state.closedTabs.length === 0) return;

  const menu = document.createElement('div');
  menu.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    max-width: 400px;
    max-height: 400px;
    overflow-y: auto;
  `;

  const title = document.createElement('h3');
  title.textContent = 'Recently Closed Tabs';
  title.style.cssText = 'margin-bottom: 12px; font-size: 14px;';
  menu.appendChild(title);

  const list = document.createElement('div');
  list.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

  // Show most recent first
  [...state.closedTabs].reverse().forEach((closedTab, index) => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 11px;
    `;

    const info = document.createElement('span');
    info.textContent = closedTab.title || closedTab.url;
    info.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

    const restoreBtn = document.createElement('button');
    restoreBtn.textContent = 'Restore';
    restoreBtn.className = 'button-small';
    restoreBtn.addEventListener('click', async () => {
      await restoreTab(closedTab);
      document.body.removeChild(overlay);
    });

    item.appendChild(info);
    item.appendChild(restoreBtn);
    list.appendChild(item);
  });

  menu.appendChild(list);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'margin-top: 12px; width: 100%; padding: 6px;';
  closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
  menu.appendChild(closeBtn);

  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 999;
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });

  overlay.appendChild(menu);
  document.body.appendChild(overlay);
}

/**
 * Restore a recently closed tab
 */
async function restoreTab(closedTab) {
  try {
    await handleOpenTabUrl(closedTab.url);

    // Remove from closed tabs
    const index = state.closedTabs.indexOf(closedTab);
    if (index !== -1) {
      state.closedTabs.splice(index, 1);
    }

    tabPersistence.save(state);
    renderTabs();
  } catch (error) {
    updateStatus(`Error restoring tab: ${error.message}`, 'error');
  }
}

/**
 * Event listeners setup
 * Centralized event listener registration
 */

// Button click events
menuButton.addEventListener('click', () => menuState.toggle());
bookmarksToggle.addEventListener('click', () => bookmarksState.toggle());
openBtn.addEventListener('click', handleOpenTab);
uploadBtn.addEventListener('click', handleUploadFile);
sendBtn.addEventListener('click', handleSendQuery);
checkHealthBtn.addEventListener('click', checkProviderHealth);
refreshModelsBtn.addEventListener('click', refreshLocalModels);
ollamaPullBtn.addEventListener('click', pullOllamaModel);
bookmarkBtn.addEventListener('click', toggleBookmark);
bookmarkSearchInput.addEventListener('input', handleBookmarkSearch);
createNotesBtn.addEventListener('click', () => {
  const tabId = createNotesTab();
  updateStatus('Notes tab created', 'success');
  // Optionally switch to the new notes tab
  switchTab(tabId);
});
sortByUrlBtn.addEventListener('click', () => setSortMode('url'));
sortByTimeBtn.addEventListener('click', () => setSortMode('time'));
sortManualBtn.addEventListener('click', () => setSortMode('manual'));

// Initialize sort button labels with initial state
updateSortButtonLabels();

// Update model select when provider changes
providerSelect.addEventListener('change', async (e) => {
  const newProvider = e.target.value;
  const previousProvider = state.currentProvider;

  // Switch to new provider using centralized function
  await switchProvider(newProvider, previousProvider);

  // Update current provider in state
  state.currentProvider = newProvider;

  // Save the last selected provider for next session
  storage.saveLastSelectedProvider(newProvider);
});

// Handle model selection - fetch dynamic models if needed
modelSelect.addEventListener('change', async (e) => {
  const provider = providerSelect.value;
  const model = e.target.value;

  // Save model selection when it changes (unless it's the fetch option)
  if (model !== '__fetch__') {
    storage.saveSelectedModel(provider, model);
  }

  // Fetch dynamic models if requested
  if (model === '__fetch__') {
    await fetchDynamicModels();
  }
});

// Handle model search input
modelSearchInput.addEventListener('input', (e) => {
  filterModels(e.target.value);
});

// Save API key when it changes (blur)
apiKeyInput.addEventListener('blur', (e) => {
  const provider = providerSelect.value;
  const apiKey = e.target.value.trim();
  storage.saveApiKey(provider, apiKey);
});

// Save API key on input (with debouncing)
let apiKeySaveTimeout;
apiKeyInput.addEventListener('input', (e) => {
  const provider = providerSelect.value;
  const apiKey = e.target.value.trim();

  // Debounce saving to avoid excessive localStorage writes
  clearTimeout(apiKeySaveTimeout);
  apiKeySaveTimeout = setTimeout(() => {
    storage.saveApiKey(provider, apiKey);
  }, 500); // Save after 500ms of no typing
});

// Save Fireworks deployment ID on blur
fireworksDeploymentInput.addEventListener('blur', (e) => {
  const deploymentId = e.target.value.trim();
  storage.saveFireworksDeployment(deploymentId);
});

// Save Fireworks deployment ID on input (with debouncing)
let deploymentSaveTimeout;
fireworksDeploymentInput.addEventListener('input', (e) => {
  const deploymentId = e.target.value.trim();

  // Debounce saving to avoid excessive localStorage writes
  clearTimeout(deploymentSaveTimeout);
  deploymentSaveTimeout = setTimeout(() => {
    storage.saveFireworksDeployment(deploymentId);
  }, 500); // Save after 500ms of no typing
});

// Save endpoint on change
endpointInput.addEventListener('change', () => {
  const provider = providerSelect.value;
  if (window.AppConfig.LOCAL_PROVIDERS.includes(provider)) {
    storage.saveEndpoint(provider, endpointInput.value.trim());
  }
});

// Keyboard shortcuts
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleOpenTab();
});
queryInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSendQuery();
});
ollamaPullInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') pullOllamaModel();
});

// Listen for tab title updates from main process
if (window.electronAPI && window.electronAPI.onTabTitleUpdated) {
  console.log('[UI] Setting up onTabTitleUpdated listener');
  window.electronAPI.onTabTitleUpdated((data) => {
    console.log('[UI] Received tab-title-updated event:', data);
    const { tabId, title } = data;
    const tab = state.activeTabs.get(tabId);
    if (tab) {
      console.log(`[UI] Updating tab ${tabId} title from "${tab.title}" to "${title}"`);
      tab.title = title;
      state.activeTabs.set(tabId, tab);
      renderTabs();
    } else {
      console.warn(`[UI] Received title update for unknown tab ${tabId}`);
    }
  });
} else {
  console.error('[UI] electronAPI.onTabTitleUpdated not available!');
}

// Listen for active tab changes from main process
if (window.electronAPI && window.electronAPI.onActiveTabChanged) {
  console.log('[UI] Setting up onActiveTabChanged listener');
  window.electronAPI.onActiveTabChanged((data) => {
    console.log('[UI] Received active-tab-changed event:', data);
    const { tabId } = data;
    state.activeTabId = tabId;
    renderTabs();
    updateBookmarkButton();
  });
} else {
  console.error('[UI] electronAPI.onActiveTabChanged not available!');
}

// Listen for bookmark toggle requests from keyboard shortcut
if (window.electronAPI && window.electronAPI.onToggleBookmark) {
  console.log('[UI] Setting up onToggleBookmark listener');
  window.electronAPI.onToggleBookmark(() => {
    console.log('[UI] Received toggle-bookmark event');
    toggleBookmark();
  });
} else {
  console.error('[UI] electronAPI.onToggleBookmark not available!');
}

// Initialize tabs on UI load - get all existing tabs from main process
if (window.electronAPI && window.electronAPI.getAllTabs) {
  console.log('[UI] Initializing tabs on UI load');
  window.electronAPI.getAllTabs().then((tabs) => {
    console.log('[UI] Retrieved existing tabs:', tabs);
    tabs.forEach(tab => {
      state.activeTabs.set(tab.id, { url: tab.url, title: tab.title });
      if (tab.isActive) {
        state.activeTabId = tab.id;
      }
    });
    renderTabs();
    updateBookmarkButton();
    console.log('[UI] Tabs initialized:', Array.from(state.activeTabs.entries()));
  }).catch(error => {
    console.error('[UI] Failed to initialize tabs:', error);
  });
} else {
  console.error('[UI] electronAPI.getAllTabs not available!');
}

// Save all settings before window closes
window.addEventListener('beforeunload', () => {
  // Save current API key
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    storage.saveApiKey(provider, apiKey);
    console.log(`Saved API key on beforeunload for provider: ${provider}`);
  }
});

// Resizer functionality for split pane
const resizer = document.getElementById('resizer');
let isResizing = false;
let startX = 0;
let startWidth = 400; // Default chat width

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  startX = e.clientX;
  startWidth = document.body.clientWidth; // Current chat panel width = window width (we're in the chat view)
  resizer.classList.add('dragging');

  // Prevent text selection during drag
  e.preventDefault();
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'ew-resize';
});

document.addEventListener('mousemove', async (e) => {
  if (!isResizing) return;

  // Calculate new width based on mouse position
  const newWidth = e.clientX;

  // Update immediately for smooth visual feedback
  if (window.electronAPI && window.electronAPI.updateChatWidth) {
    try {
      await window.electronAPI.updateChatWidth(newWidth);
    } catch (error) {
      console.error('Error updating chat width:', error);
    }
  }
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
});

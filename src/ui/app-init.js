// Application initialization
// This file must load LAST after all modules are loaded

/**
 * Initialize application
 */
async function initialize() {
  // Initialize menu state
  menuState.init();

  // Initialize bookmarks collapse state
  bookmarksState.init();

  // Load providers
  await loadProviders();

  // Restore last selected provider
  const lastProvider = storage.getLastSelectedProvider();
  if (lastProvider && providerSelect.querySelector(`option[value="${lastProvider}"]`)) {
    providerSelect.value = lastProvider;
    console.log(`Restored last selected provider: ${lastProvider}`);
  }

  // Initialize provider-specific UI using centralized function
  const provider = providerSelect.value;
  state.currentProvider = provider;

  // Load provider settings (handles API keys, endpoints, models, UI elements, etc.)
  await initializeProviderUI(provider);

  // Load persisted tab management data
  const tabData = tabPersistence.load();
  state.closedTabs = tabData.closedTabs;
  console.log('Loaded tab management data:', {
    closedTabs: state.closedTabs.length
  });

  // The model will be restored automatically when updateModelSelect is called above

  // Initialize bookmarks
  renderBookmarks();
  updateBookmarkButton();

  updateStatus('Ready', 'success');
  addMessage('👋 Welcome! Open a URL or upload a file to get started.', 'system');
  addMessage('💡 Tip: Press F12 to open DevTools for the UI, Ctrl+Shift+C for the active tab', 'system');
}

// Start the application
initialize();

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

  // Initialize provider-specific UI (this will handle API keys, endpoints, models, etc.)
  const provider = providerSelect.value;
  state.currentProvider = provider;

  // Handle local providers
  const isLocal = window.AppConfig.LOCAL_PROVIDERS.includes(provider);
  if (isLocal) {
    // Show endpoint configuration
    endpointRow.style.display = 'flex';
    refreshModelsBtn.style.display = 'inline-block';

    // Load saved endpoint
    const savedEndpoint = storage.getEndpoint(provider);
    endpointInput.value = savedEndpoint;

    // Show Ollama management if Ollama is selected
    ollamaManagement.style.display = (provider === 'ollama') ? 'block' : 'none';

    // Make API key optional for local providers
    apiKeyInput.placeholder = 'API Key (optional for local providers)';
    apiKeyInput.value = storage.getApiKey(provider);

    // Check health and fetch models
    await checkProviderHealth();
    await refreshLocalModels();
  } else {
    // Hide local provider UI
    endpointRow.style.display = 'none';
    refreshModelsBtn.style.display = 'none';
    ollamaManagement.style.display = 'none';
    apiKeyInput.placeholder = 'API Key...';

    // Restore API key for cloud provider (always load to ensure clean state)
    const savedApiKey = storage.getApiKey(provider);
    apiKeyInput.value = savedApiKey;
    if (savedApiKey) {
      console.log(`Restored API key on init for provider: ${provider}`);
    }
  }

  // Show Fireworks deployment field if Fireworks is selected
  if (provider === 'fireworks') {
    fireworksDeploymentRow.style.display = 'flex';
    const savedDeployment = storage.getFireworksDeployment();
    if (savedDeployment) {
      fireworksDeploymentInput.value = savedDeployment;
      console.log(`Restored Fireworks deployment ID: ${savedDeployment}`);
    }
  } else {
    fireworksDeploymentRow.style.display = 'none';
  }

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

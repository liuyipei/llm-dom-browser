/**
 * Provider UI Management
 * Centralized module for handling provider switching and configuration UI
 *
 * This module consolidates all provider-related UI updates into a single function
 * to prevent bugs from duplicated logic across initialization and event handlers.
 */

/**
 * Load and configure UI for a specific provider
 * This is the SINGLE SOURCE OF TRUTH for provider UI configuration
 *
 * @param {string} provider - Provider ID (e.g., 'fireworks', 'ollama', 'openai')
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoCheckHealth - Auto-check health for local providers (default: false)
 * @param {boolean} options.autoFetchModels - Auto-fetch models for local providers (default: false)
 * @param {boolean} options.savePrevious - Save previous provider settings before switching (default: false)
 * @param {string} options.previousProvider - Previous provider ID (required if savePrevious is true)
 * @returns {Promise<void>}
 */
async function loadProviderSettings(provider, options = {}) {
  const {
    autoCheckHealth = false,
    autoFetchModels = false,
    savePrevious = false,
    previousProvider = null
  } = options;

  // Save previous provider settings if requested
  if (savePrevious && previousProvider) {
    storage.saveApiKey(previousProvider, apiKeyInput.value.trim());
    console.log(`Saved API key for previous provider: ${previousProvider}`);

    if (window.AppConfig.LOCAL_PROVIDERS.includes(previousProvider)) {
      storage.saveEndpoint(previousProvider, endpointInput.value.trim());
      console.log(`Saved endpoint for previous provider: ${previousProvider}`);
    }
  }

  // Determine if this is a local provider
  const isLocal = window.AppConfig.LOCAL_PROVIDERS.includes(provider);

  // 1. ALWAYS load and set API key (unconditionally to clear stale values from other providers)
  const savedApiKey = storage.getApiKey(provider);
  apiKeyInput.value = savedApiKey;
  apiKeyInput.placeholder = isLocal
    ? 'API Key (optional for local providers)'
    : 'API Key...';

  if (savedApiKey) {
    console.log(`Restored API key for provider: ${provider}`);
  }

  // 2. Handle local provider UI elements
  endpointRow.style.display = isLocal ? 'flex' : 'none';
  refreshModelsBtn.style.display = isLocal ? 'inline-block' : 'none';
  ollamaManagement.style.display = (provider === 'ollama') ? 'block' : 'none';

  // 3. Handle endpoints for local providers
  if (isLocal) {
    const savedEndpoint = storage.getEndpoint(provider);
    endpointInput.value = savedEndpoint;
    console.log(`Restored endpoint for provider ${provider}: ${savedEndpoint}`);
  }

  // 4. Handle provider-specific UI (Fireworks deployment)
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

  // 5. Update model dropdown
  updateModelSelect();

  // 6. Auto-check health and fetch models for local providers if requested
  if (isLocal) {
    if (autoCheckHealth) {
      await checkProviderHealth();
    }
    if (autoFetchModels) {
      await refreshLocalModels();
    }
  }
}

/**
 * Initialize provider UI on app startup
 * Wrapper around loadProviderSettings with sensible defaults for initialization
 *
 * @param {string} provider - Provider ID to initialize
 * @returns {Promise<void>}
 */
async function initializeProviderUI(provider) {
  await loadProviderSettings(provider, {
    autoCheckHealth: window.AppConfig.LOCAL_PROVIDERS.includes(provider),
    autoFetchModels: window.AppConfig.LOCAL_PROVIDERS.includes(provider),
    savePrevious: false
  });
}

/**
 * Switch to a different provider
 * Wrapper around loadProviderSettings with sensible defaults for provider switching
 *
 * @param {string} newProvider - New provider ID to switch to
 * @param {string} previousProvider - Previous provider ID (for saving settings)
 * @returns {Promise<void>}
 */
async function switchProvider(newProvider, previousProvider) {
  await loadProviderSettings(newProvider, {
    autoCheckHealth: window.AppConfig.LOCAL_PROVIDERS.includes(newProvider),
    autoFetchModels: window.AppConfig.LOCAL_PROVIDERS.includes(newProvider),
    savePrevious: true,
    previousProvider
  });
}

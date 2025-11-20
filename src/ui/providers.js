/**
 * Provider and model management
 * Handles provider selection, model fetching, health checks, and model search
 */

/**
 * Load available providers and models
 */
async function loadProviders() {
  try {
    const data = await window.electronAPI.getProviders();
    providersData = data;
    updateModelSelect();
  } catch (error) {
    console.error('Error loading providers:', error);
  }
}

/**
 * Update model dropdown based on selected provider
 */
function updateModelSelect() {
  if (!providersData) return;

  const provider = providerSelect.value;

  // Check if we have previously fetched models for this provider
  const fetchedModels = storage.getFetchedModels(provider);

  if (fetchedModels) {
    // Use fetched models from localStorage
    console.log(`Restoring fetched models for ${provider} from localStorage`);
    populateFetchedModels(fetchedModels);
  } else {
    // Use default models from providersData
    const models = providersData.models[provider] || {};

    // Clear existing options
    modelSelect.innerHTML = '<option value="">Default</option>';

    // Add models for selected provider
    Object.entries(models).forEach(([modelId, modelInfo]) => {
      const option = document.createElement('option');
      option.value = modelId;
      option.textContent = modelInfo.name || modelId;
      modelSelect.appendChild(option);
    });

    // For OpenRouter and Fireworks, show option to fetch latest models
    if (provider === 'openrouter' || provider === 'fireworks') {
      const fetchOption = document.createElement('option');
      fetchOption.value = '__fetch__';
      fetchOption.textContent = '🔄 Fetch Latest Models...';
      fetchOption.style.fontWeight = 'bold';
      modelSelect.insertBefore(fetchOption, modelSelect.firstChild.nextSibling);
    }
  }

  // Restore previously selected model for this provider
  const savedModel = storage.getSelectedModel(provider);
  if (savedModel && modelSelect.querySelector(`option[value="${savedModel}"]`)) {
    modelSelect.value = savedModel;
  }

  // Update search state and toggle search input visibility
  updateModelSearchState();
  toggleModelSearch();
}

/**
 * Populate model select with fetched models
 */
function populateFetchedModels(models) {
  // Clear and repopulate dropdown
  modelSelect.innerHTML = '<option value="">Default (Recommended)</option>';

  // Add flagship models section
  if (models.flagship && models.flagship.length > 0) {
    const flagshipGroup = document.createElement('optgroup');
    flagshipGroup.label = '⭐ Flagship Models';
    models.flagship.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.name} (${Math.floor(model.context_length / 1000)}K)`;
      flagshipGroup.appendChild(option);
    });
    modelSelect.appendChild(flagshipGroup);
  }

  // Add reasoning models section
  if (models.reasoning && models.reasoning.length > 0) {
    const reasoningGroup = document.createElement('optgroup');
    reasoningGroup.label = '🧠 Reasoning Models';
    models.reasoning.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.name} (${Math.floor(model.context_length / 1000)}K)`;
      reasoningGroup.appendChild(option);
    });
    modelSelect.appendChild(reasoningGroup);
  }

  // Add coding models section
  if (models.coding && models.coding.length > 0) {
    const codingGroup = document.createElement('optgroup');
    codingGroup.label = '💻 Coding Models';
    models.coding.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.name} (${Math.floor(model.context_length / 1000)}K)`;
      codingGroup.appendChild(option);
    });
    modelSelect.appendChild(codingGroup);
  }

  // Add all models section
  if (models.all && models.all.length > 0) {
    const allGroup = document.createElement('optgroup');
    allGroup.label = '📋 All Available Models';
    models.all.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      const contextSize = model.context_length ? ` (${Math.floor(model.context_length / 1000)}K)` : '';
      option.textContent = `${model.name}${contextSize}`;
      allGroup.appendChild(option);
    });
    modelSelect.appendChild(allGroup);
  }

  // Add fetch option at the beginning
  const provider = providerSelect.value;
  if (provider === 'openrouter' || provider === 'fireworks') {
    const fetchOption = document.createElement('option');
    fetchOption.value = '__fetch__';
    fetchOption.textContent = '🔄 Refresh Models...';
    fetchOption.style.fontWeight = 'bold';
    modelSelect.insertBefore(fetchOption, modelSelect.firstChild.nextSibling);
  }

  // Update search state and toggle search input visibility
  updateModelSearchState();
  toggleModelSearch();
}

/**
 * Update model search state by storing all current options and optgroups
 */
function updateModelSearchState() {
  modelSearchState.allOptions = Array.from(modelSelect.querySelectorAll('option'));
  modelSearchState.allOptgroups = Array.from(modelSelect.querySelectorAll('optgroup'));
}

/**
 * Toggle search input visibility based on number of models
 */
function toggleModelSearch() {
  const optionCount = modelSelect.querySelectorAll('option').length;
  // Show search if there are more than 10 options (excluding special options like Default and Fetch)
  if (optionCount > 10) {
    modelSearchInput.style.display = 'block';
  } else {
    modelSearchInput.style.display = 'none';
    modelSearchInput.value = ''; // Clear search when hidden
  }
}

/**
 * Filter models based on search term
 */
function filterModels(searchTerm) {
  const term = searchTerm.toLowerCase().trim();

  if (!term) {
    // No search term - restore all options and optgroups
    modelSelect.innerHTML = '';
    modelSearchState.allOptions.forEach(option => {
      modelSelect.appendChild(option);
    });
    modelSearchState.allOptgroups.forEach(optgroup => {
      modelSelect.appendChild(optgroup);
    });
    return;
  }

  // Clear the select
  modelSelect.innerHTML = '';

  // Filter and add matching options
  let hasMatches = false;

  // Handle options that are direct children (not in optgroups)
  modelSearchState.allOptions.forEach(option => {
    const text = option.textContent.toLowerCase();
    const value = option.value.toLowerCase();

    if (text.includes(term) || value.includes(term)) {
      // Check if this option belongs to an optgroup
      const belongsToOptgroup = modelSearchState.allOptgroups.some(og =>
        Array.from(og.querySelectorAll('option')).includes(option)
      );

      if (!belongsToOptgroup) {
        modelSelect.appendChild(option.cloneNode(true));
        hasMatches = true;
      }
    }
  });

  // Handle optgroups
  modelSearchState.allOptgroups.forEach(optgroup => {
    const clonedOptgroup = optgroup.cloneNode(false); // Clone without children
    let groupHasMatches = false;

    Array.from(optgroup.querySelectorAll('option')).forEach(option => {
      const text = option.textContent.toLowerCase();
      const value = option.value.toLowerCase();

      if (text.includes(term) || value.includes(term)) {
        clonedOptgroup.appendChild(option.cloneNode(true));
        groupHasMatches = true;
        hasMatches = true;
      }
    });

    if (groupHasMatches) {
      modelSelect.appendChild(clonedOptgroup);
    }
  });

  // If no matches, show a message
  if (!hasMatches) {
    const noMatchOption = document.createElement('option');
    noMatchOption.disabled = true;
    noMatchOption.textContent = 'No models match your search';
    modelSelect.appendChild(noMatchOption);
  }
}

/**
 * Fetch models dynamically for OpenRouter/Fireworks
 */
async function fetchDynamicModels() {
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    updateStatus('Please enter API key to fetch models', 'error');
    return;
  }

  if (provider !== 'openrouter' && provider !== 'fireworks') {
    return;
  }

  // Save API key before using it
  storage.saveApiKey(provider, apiKey);

  try {
    updateStatus(`Fetching latest models from ${provider}...`);
    const result = await window.electronAPI.fetchProviderModels(provider, apiKey);

    if (result.success && result.models) {
      // Save fetched models to localStorage
      storage.saveFetchedModels(provider, result.models);

      // Populate dropdown with fetched models
      populateFetchedModels(result.models);

      updateStatus(`Loaded ${result.models.all.length} models from ${provider}`, 'success');
    } else {
      updateStatus(`Failed to fetch models: ${result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    updateStatus(`Error fetching models: ${error.message}`, 'error');
  }
}

/**
 * Check health of local provider
 */
async function checkProviderHealth() {
  const provider = providerSelect.value;
  const endpoint = endpointInput.value.trim();

  if (!window.AppConfig.LOCAL_PROVIDERS.includes(provider)) {
    return;
  }

  healthStatus.textContent = 'Checking...';
  healthStatus.style.color = '#999';

  try {
    const result = await window.electronAPI.checkProviderHealth(provider, endpoint);

    if (result.success && result.health.healthy) {
      healthStatus.textContent = '✓ Connected';
      healthStatus.style.color = '#4CAF50';
    } else {
      healthStatus.textContent = '✗ ' + (result.health.error || 'Not connected');
      healthStatus.style.color = '#f44336';
    }
  } catch (error) {
    healthStatus.textContent = '✗ Error: ' + error.message;
    healthStatus.style.color = '#f44336';
  }
}

/**
 * Refresh models from local provider
 */
async function refreshLocalModels() {
  const provider = providerSelect.value;
  const endpoint = endpointInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!window.AppConfig.LOCAL_PROVIDERS.includes(provider)) {
    return;
  }

  try {
    updateStatus(`Fetching models from ${provider}...`);

    const result = await window.electronAPI.fetchLocalModels(provider, endpoint, apiKey);

    if (result.success && result.models && result.models.length > 0) {
      // Clear and populate model select
      modelSelect.innerHTML = '<option value="">Select a model</option>';

      result.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id || model.name;
        option.textContent = model.name || model.id;
        modelSelect.appendChild(option);
      });

      // Restore previously selected model
      const savedModel = storage.getSelectedModel(provider);
      if (savedModel && modelSelect.querySelector(`option[value="${savedModel}"]`)) {
        modelSelect.value = savedModel;
      }

      // Update search state and toggle search input visibility
      updateModelSearchState();
      toggleModelSearch();

      updateStatus(`Loaded ${result.models.length} models from ${provider}`, 'success');
    } else if (result.success && result.models.length === 0) {
      modelSelect.innerHTML = '<option value="">No models found</option>';
      updateModelSearchState();
      toggleModelSearch();
      updateStatus(`No models found. Pull a model to get started.`, 'warning');
    } else {
      updateStatus(`Failed to fetch models: ${result.error || 'Service not available'}`, 'error');
    }
  } catch (error) {
    updateStatus(`Error fetching models: ${error.message}`, 'error');
  }
}

/**
 * Pull Ollama model
 */
async function pullOllamaModel() {
  const modelName = ollamaPullInput.value.trim();
  const endpoint = endpointInput.value.trim();

  if (!modelName) {
    ollamaPullProgress.textContent = 'Please enter a model name';
    ollamaPullProgress.style.color = '#f44336';
    return;
  }

  ollamaPullBtn.disabled = true;
  ollamaPullProgress.textContent = `Pulling ${modelName}...`;
  ollamaPullProgress.style.color = '#2196F3';

  try {
    // Listen for progress updates
    window.electronAPI.onOllamaPullProgress((data) => {
      if (data.modelName === modelName) {
        const progress = data.progress;
        if (progress.status) {
          ollamaPullProgress.textContent = `${progress.status}${progress.completed ? ` (${progress.completed}/${progress.total})` : ''}`;
        }
      }
    });

    const result = await window.electronAPI.ollamaPullModel(modelName, endpoint);

    if (result.success) {
      ollamaPullProgress.textContent = `✓ Successfully pulled ${modelName}`;
      ollamaPullProgress.style.color = '#4CAF50';
      ollamaPullInput.value = '';

      // Refresh models list
      await refreshLocalModels();
    } else {
      ollamaPullProgress.textContent = `✗ Failed: ${result.error}`;
      ollamaPullProgress.style.color = '#f44336';
    }
  } catch (error) {
    ollamaPullProgress.textContent = `✗ Error: ${error.message}`;
    ollamaPullProgress.style.color = '#f44336';
  } finally {
    ollamaPullBtn.disabled = false;
  }
}

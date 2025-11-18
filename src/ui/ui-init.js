/**
 * UI Initialization
 * Populates dynamic UI elements and provides helper functions
 */

// Initialize provider dropdown on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeProviderDropdown();
});

/**
 * Generate and populate provider dropdown options
 */
function initializeProviderDropdown() {
  const providerSelect = document.getElementById('providerSelect');
  if (!providerSelect || !window.AppConfig) {
    console.error('Provider select element or AppConfig not found');
    return;
  }

  const { PROVIDER_LABELS, PROVIDER_GROUPS } = window.AppConfig;

  let html = '';

  // Add cloud providers
  PROVIDER_GROUPS.cloud.forEach(providerId => {
    const label = PROVIDER_LABELS[providerId];
    if (label) {
      html += `<option value="${providerId}">${label}</option>`;
    }
  });

  // Add local providers in optgroup
  if (PROVIDER_GROUPS.local && PROVIDER_GROUPS.local.length > 0) {
    html += '<optgroup label="Local Providers">';
    PROVIDER_GROUPS.local.forEach(providerId => {
      const label = PROVIDER_LABELS[providerId];
      if (label) {
        html += `<option value="${providerId}">${label}</option>`;
      }
    });
    html += '</optgroup>';
  }

  providerSelect.innerHTML = html;
  console.log('Provider dropdown initialized with', PROVIDER_GROUPS.cloud.length + PROVIDER_GROUPS.local.length, 'providers');
}

/**
 * Helper function to check if provider is local
 */
function isLocalProvider(providerId) {
  return window.AppConfig.LOCAL_PROVIDERS.includes(providerId);
}

/**
 * Helper function to get default endpoint
 */
function getDefaultEndpoint(providerId) {
  return window.AppConfig.DEFAULT_ENDPOINTS[providerId] || '';
}

// Make helpers available globally
if (typeof window !== 'undefined') {
  window.UIHelpers = {
    isLocalProvider,
    getDefaultEndpoint
  };
}

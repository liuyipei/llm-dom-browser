/**
 * UI utility functions for dynamic UI generation
 * Eliminates hardcoded HTML elements
 */

/**
 * Generate provider dropdown options dynamically from config
 * @param {Object} config - Configuration object with PROVIDER_LABELS and PROVIDER_GROUPS
 * @returns {string} HTML string for provider options
 */
function generateProviderOptions(config) {
  const { PROVIDER_LABELS, PROVIDER_GROUPS } = config;

  let html = '';

  // Add cloud providers
  PROVIDER_GROUPS.cloud.forEach(providerId => {
    const label = PROVIDER_LABELS[providerId];
    if (label) {
      html += `<option value="${providerId}">${label}</option>\n`;
    }
  });

  // Add local providers in optgroup
  if (PROVIDER_GROUPS.local && PROVIDER_GROUPS.local.length > 0) {
    html += '<optgroup label="Local Providers">\n';
    PROVIDER_GROUPS.local.forEach(providerId => {
      const label = PROVIDER_LABELS[providerId];
      if (label) {
        html += `<option value="${providerId}">${label}</option>\n`;
      }
    });
    html += '</optgroup>\n';
  }

  return html;
}

/**
 * Populate provider dropdown in the DOM
 * @param {HTMLSelectElement} selectElement - The select element to populate
 * @param {Object} config - Configuration object
 */
function populateProviderDropdown(selectElement, config) {
  if (!selectElement) {
    console.error('Provider select element not found');
    return;
  }

  selectElement.innerHTML = generateProviderOptions(config);
}

/**
 * Get provider configuration constants
 * This function can be used to access provider config from modules
 */
function getProviderEndpoint(providerId, endpoints) {
  return endpoints[providerId] || '';
}

/**
 * Check if a provider is a local provider
 */
function isLocalProvider(providerId, optionalApiKeyProviders) {
  return optionalApiKeyProviders.includes(providerId);
}

/**
 * Check if a provider supports custom endpoints
 */
function supportsCustomEndpoint(providerId, customEndpointProviders) {
  return customEndpointProviders.includes(providerId);
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.UIUtils = {
    generateProviderOptions,
    populateProviderDropdown,
    getProviderEndpoint,
    isLocalProvider,
    supportsCustomEndpoint
  };
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateProviderOptions,
    populateProviderDropdown,
    getProviderEndpoint,
    isLocalProvider,
    supportsCustomEndpoint
  };
}

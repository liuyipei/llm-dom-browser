/**
 * Content Preload Script
 * Runs in the renderer process with access to DOM
 * Safely exposes DOM serialization API to web content via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');
const { serializeDOM } = require('./modules/dom-serializer');

/**
 * Serialize DOM into a structured format suitable for LLM analysis
 * Avoids DOM objects and returns only serializable data
 * @param {Object} options - Extraction options
 * @param {boolean} options.includeMedia - Whether to extract media elements (images, videos)
 */
function getSerializedDOM(options = {}) {
  try {
    return serializeDOM(options);
  } catch (error) {
    console.error('Error serializing DOM:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Expose safe API via contextBridge
 * This is the ONLY way to safely communicate with the main process
 */
contextBridge.exposeInMainWorld('contentAPI', {
  getSerializedDOM,
  // Version info for debugging
  version: '1.0.0'
});

/**
 * Inject CSS to ensure scrollbars are always visible
 * This helps users see scroll position and supports mice without scroll wheels
 */
function injectScrollbarStyles() {
  try {
    const style = document.createElement('style');
    style.id = 'llm-browser-scrollbar-style';
    style.textContent = `
      /* Force scrollbars to be visible - important flags to override any site styles */
      ::-webkit-scrollbar {
        width: 14px !important;
        height: 14px !important;
        -webkit-appearance: none !important;
      }

      ::-webkit-scrollbar-track {
        background: #f1f1f1 !important;
        border-radius: 0px !important;
        border-left: 1px solid #ddd !important;
      }

      ::-webkit-scrollbar-thumb {
        background: #888 !important;
        border-radius: 0px !important;
        border: 1px solid #777 !important;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #555 !important;
      }

      /* Ensure scrollbar is always visible, not just on hover */
      html {
        overflow-y: scroll !important;
        scrollbar-gutter: stable !important;
        scrollbar-width: auto !important; /* For Firefox */
      }

      body {
        overflow-y: auto !important;
      }

      /* Force non-overlay scrollbars on body */
      html, body {
        -webkit-overflow-scrolling: auto !important;
      }
    `;

    // Wait for DOM to be ready before injecting
    if (document.head) {
      document.head.appendChild(style);
      console.log('[LLM Browser] Scrollbar styles injected successfully');
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.head.appendChild(style);
        console.log('[LLM Browser] Scrollbar styles injected successfully (after DOMContentLoaded)');
      });
    }
  } catch (error) {
    console.error('[LLM Browser] Error injecting scrollbar styles:', error);
  }
}

// Inject styles when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScrollbarStyles);
} else {
  // DOM already loaded
  injectScrollbarStyles();
}

/**
 * Setup link click interception for Chrome-like behavior
 * - Ctrl+Click (Cmd+Click on Mac): Open in new background tab
 * - Ctrl+Shift+Click (Cmd+Shift+Click on Mac): Open in new foreground tab
 * - Middle-click (button 1): Open in new background tab
 */
function setupLinkClickHandler() {
  try {
    // Capture phase to intercept before site handlers
    document.addEventListener('click', (event) => {
      // Find the closest anchor tag
      let target = event.target;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }

      // Not a link, let it through
      if (!target || target.tagName !== 'A') {
        return;
      }

      const href = target.href;

      // Ignore empty hrefs, javascript:, mailto:, tel:, etc.
      if (!href ||
          href.startsWith('javascript:') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('#')) {
        return;
      }

      // Note: Ctrl+Click and Cmd+Click are now handled by setWindowOpenHandler in tab-manager.js
      // This is more reliable as it intercepts Electron's native window opening before DOM events
      // We only handle middle-click here as a fallback

      const middleClick = event.button === 1;

      // Middle-click: Open in new background tab
      if (middleClick) {
        event.preventDefault();
        event.stopPropagation();

        // Send IPC to main process to open in new tab
        ipcRenderer.send('open-link-in-new-tab', {
          url: href,
          foreground: false
        });

        console.log(`[LLM Browser] Middle-click: Opening link in new background tab:`, href);
      }
      // Normal click and Ctrl+Click: let Electron handle it via setWindowOpenHandler
    }, true); // Use capture phase

    // Also handle middle-click (auxclick event)
    document.addEventListener('auxclick', (event) => {
      // Middle-click is button 1
      if (event.button !== 1) {
        return;
      }

      // Find the closest anchor tag
      let target = event.target;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }

      if (!target || target.tagName !== 'A') {
        return;
      }

      const href = target.href;

      if (!href ||
          href.startsWith('javascript:') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('#')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // Middle-click opens in background tab (Chrome behavior)
      ipcRenderer.send('open-link-in-new-tab', {
        url: href,
        foreground: false
      });

      console.log('[LLM Browser] Middle-click: Opening link in new background tab:', href);
    }, true);

    console.log('[LLM Browser] Link click handler initialized');
  } catch (error) {
    console.error('[LLM Browser] Error setting up link click handler:', error);
  }
}

// Setup link click handler when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLinkClickHandler);
} else {
  setupLinkClickHandler();
}

console.log('Content preload script loaded');

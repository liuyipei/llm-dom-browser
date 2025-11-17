/**
 * Content Preload Script
 * Runs in the renderer process with access to DOM
 * Safely exposes DOM serialization API to web content via contextBridge
 */

const { contextBridge } = require('electron');

/**
 * Serialize DOM into a structured format suitable for LLM analysis
 * Avoids DOM objects and returns only serializable data
 */
function getSerializedDOM() {
  try {
    // Extract metadata
    const title = document.title || '';
    const url = window.location.href || '';

    // Extract headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(
      (heading) => ({
        level: heading.tagName.toLowerCase(),
        text: heading.textContent?.trim() || '',
        id: heading.id || null
      })
    );

    // Extract main paragraphs (first 100 to avoid token bloat)
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .slice(0, 100)
      .map((p) => ({
        text: p.textContent?.trim() || '',
        id: p.id || null
      }));

    // Extract links (useful for navigation context)
    const links = Array.from(document.querySelectorAll('a'))
      .slice(0, 50)
      .map((a) => ({
        text: a.textContent?.trim() || '',
        href: a.href || '',
        title: a.title || ''
      }));

    // Extract custom elements marked with data-llm-* attributes
    const customElements = Array.from(document.querySelectorAll('[data-llm-important]')).map(
      (el) => ({
        tag: el.tagName.toLowerCase(),
        content: el.textContent?.trim() || '',
        attributes: {
          class: el.className || null,
          id: el.id || null,
          dataLlm: el.getAttribute('data-llm-important') || null
        }
      })
    );

    // Extract main content area if available
    let mainContent = '';
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      mainContent = main.textContent?.trim().slice(0, 2000) || '';
    } else {
      // Fallback: get body text
      mainContent = document.body?.textContent?.trim().slice(0, 2000) || '';
    }

    // Extract meta tags for context
    const metaTags = {};
    document.querySelectorAll('meta').forEach((meta) => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (name && content) {
        metaTags[name] = content;
      }
    });

    return {
      title,
      url,
      headings,
      paragraphs,
      links,
      customElements,
      mainContent,
      metaTags,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error serializing DOM:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get page metadata quickly (useful for tab lists)
 */
function getPageMetadata() {
  try {
    return {
      title: document.title || '',
      url: window.location.href || '',
      description:
        document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      language: document.documentElement.lang || 'unknown'
    };
  } catch (error) {
    console.error('Error getting page metadata:', error);
    return { error: error.message };
  }
}

/**
 * Execute a command in the page context (sandbox: limited functionality)
 * Only safe, read-only operations are allowed
 */
function executeCommand(command, args) {
  try {
    switch (command) {
      case 'get-text-by-selector':
        const elem = document.querySelector(args.selector);
        return elem?.textContent?.trim() || null;

      case 'find-text':
        const treeWalker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        const results = [];
        let node;
        while ((node = treeWalker.nextNode())) {
          if (node.textContent.includes(args.text)) {
            results.push(node.textContent.trim());
          }
        }
        return results.slice(0, 10);

      case 'get-links':
        return Array.from(document.querySelectorAll('a'))
          .map((a) => ({ text: a.textContent?.trim(), href: a.href }))
          .slice(0, 20);

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('Error executing command:', error);
    return { error: error.message };
  }
}

/**
 * Expose safe API via contextBridge
 * This is the ONLY way to safely communicate with the main process
 */
contextBridge.exposeInMainWorld('contentAPI', {
  getSerializedDOM,
  getPageMetadata,
  executeCommand,
  // Version info for debugging
  version: '1.0.0'
});

console.log('Content preload script loaded');

/**
 * Content Preload Script
 * Runs in the renderer process with access to DOM
 * Safely exposes DOM serialization API to web content via contextBridge
 */

const { contextBridge } = require('electron');

/**
 * Helper function to resolve relative URLs to absolute URLs
 */
function resolveURL(url, baseURL) {
  try {
    return new URL(url, baseURL).href;
  } catch (error) {
    return url; // Return original if resolution fails
  }
}

/**
 * Serialize DOM into a structured format suitable for LLM analysis
 * Avoids DOM objects and returns only serializable data
 * @param {Object} options - Extraction options
 * @param {boolean} options.includeMedia - Whether to extract media elements (images, videos)
 */
function getSerializedDOM(options = {}) {
  try {
    const { includeMedia = false } = options;

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

    // Extract media metadata (always - useful for context even without screenshots)
    // Extract images (first 20 to balance usefulness vs token cost)
    const images = Array.from(document.querySelectorAll('img'))
      .slice(0, 20)
      .map((img) => ({
        src: resolveURL(img.src || img.getAttribute('src') || '', url),
        alt: img.alt || '',
        width: img.width || null,
        height: img.height || null,
        title: img.title || '',
        loading: img.loading || null
      }))
      .filter((img) => img.src && img.src !== url); // Filter out empty or self-referencing URLs

    // Extract videos (first 10)
    const videos = Array.from(document.querySelectorAll('video'))
      .slice(0, 10)
      .map((video) => ({
        poster: video.poster ? resolveURL(video.poster, url) : null,
        src: video.src ? resolveURL(video.src, url) : null,
        width: video.width || null,
        height: video.height || null,
        sources: Array.from(video.querySelectorAll('source')).map((source) => ({
          src: source.src ? resolveURL(source.src, url) : null,
          type: source.type || null
        }))
      }))
      .filter((video) => video.poster || video.src || video.sources.length > 0);

    const result = {
      title,
      url,
      headings,
      paragraphs,
      links,
      customElements,
      mainContent,
      metaTags,
      media: {
        images,
        videos,
        count: {
          images: images.length,
          videos: videos.length
        }
      },
      timestamp: new Date().toISOString()
    };

    return result;
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

console.log('Content preload script loaded');

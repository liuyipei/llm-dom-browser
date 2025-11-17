/**
 * LLM Orchestrator Service
 * Manages LLM API interactions and content analysis
 * Coordinates extraction from multiple WebContentsView instances
 */

const ProviderFactory = require('../providers/provider-factory');
const { PROVIDERS, MODELS, OPTIONAL_API_KEY_PROVIDERS } = require('../providers/models');

class LLMOrchestrator {
  constructor() {
    this.contentViews = new Map();
    this.llmClient = null;
    this.requestHistory = [];
    this.maxHistory = 50;
    this.currentProvider = null;
  }

  /**
   * Set reference to content views map (called from main.js)
   */
  setContentViews(contentViews) {
    this.contentViews = contentViews;
  }

  /**
   * Analyze content from one or more tabs using LLM
   */
  async analyzeContent(query, tabIds, apiKey, provider = 'openai', model = null, includeMedia = false, customEndpoint = null) {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid query');
      }

      // API key is optional for local providers (Ollama, vLLM, LM Studio)
      const isLocalProvider = OPTIONAL_API_KEY_PROVIDERS.includes(provider);
      if (!isLocalProvider && (!apiKey || typeof apiKey !== 'string')) {
        throw new Error('API key is required');
      }

      if (!Array.isArray(tabIds)) {
        throw new Error('Tab IDs must be an array');
      }

      // Extract content from all specified tabs
      const contextItems = await this._extractContextFromTabs(tabIds, { includeMedia });

      if (contextItems.length === 0) {
        throw new Error('No content available from specified tabs');
      }

      // Build the LLM prompt with extracted content
      const prompt = this._buildPrompt(query, contextItems);

      // Track latency
      const startTime = Date.now();

      // Send to LLM API (local or remote)
      const llmResult = await this._queryRemoteLLM(prompt, apiKey, provider, model, includeMedia, customEndpoint);

      const latencyMs = Date.now() - startTime;

      // Store in history
      this._addToHistory({
        timestamp: new Date().toISOString(),
        query,
        tabIds,
        provider,
        model,
        includeMedia,
        contextLength: prompt.length,
        responseLength: llmResult.text ? llmResult.text.length : 0,
        latencyMs,
        usage: llmResult.usage
      });

      return {
        success: true,
        response: llmResult.text || llmResult,
        contextSize: contextItems.length,
        provider,
        model,
        latencyMs,
        usage: llmResult.usage || {},
        tokensUsed: llmResult.usage?.total_tokens || Math.ceil(prompt.length / 4)
      };
    } catch (error) {
      console.error('Error analyzing content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract content from specified tabs
   */
  async _extractContextFromTabs(tabIds, options = {}) {
    const contextItems = [];
    const { includeMedia = false } = options;

    for (const tabId of tabIds) {
      try {
        const view = this.contentViews.get(tabId);
        if (!view) {
          console.warn(`Tab ${tabId} not found`);
          continue;
        }

        const url = view.webContents.getURL();
        const title = view.webContents.getTitle();

        // Check if PDF or HTML
        if (url.endsWith('.pdf') || url.includes('.pdf?')) {
          // For PDFs, we would need to extract text
          // This is handled by the main process via PDFService
          contextItems.push({
            tabId,
            type: 'pdf',
            title,
            url,
            content: '(PDF - requires separate extraction)' // Placeholder
          });
        } else {
          // Extract HTML DOM
          try {
            const domData = await view.webContents.executeJavaScript(
              `window.contentAPI ? window.contentAPI.getSerializedDOM(${JSON.stringify(options)}) : null`
            );

            const contextItem = {
              tabId,
              type: 'html',
              title: domData.title || title,
              url: domData.url || url,
              dom: domData
            };

            // Capture screenshot if media is enabled
            if (includeMedia && domData) {
              try {
                const screenshot = await this._capturePageScreenshot(view);
                contextItem.screenshot = screenshot;
              } catch (screenshotError) {
                console.warn(`Failed to capture screenshot for tab ${tabId}:`, screenshotError);
                contextItem.screenshotError = screenshotError.message;
              }
            }

            if (domData) {
              contextItems.push(contextItem);
            }
          } catch (jsError) {
            console.warn(`Failed to extract DOM from tab ${tabId}:`, jsError);
            contextItems.push({
              tabId,
              type: 'html',
              title,
              url,
              dom: null,
              error: 'DOM extraction failed'
            });
          }
        }
      } catch (error) {
        console.error(`Error extracting context from tab ${tabId}:`, error);
      }
    }

    return contextItems;
  }

  /**
   * Capture page screenshot and resize to max 512px on long edge
   * @param {WebContentsView} view - The view to capture
   * @returns {Object} Screenshot data with base64 and dimensions
   */
  async _capturePageScreenshot(view) {
    // Capture the visible area of the page
    const image = await view.webContents.capturePage();

    // Get original dimensions
    const size = image.getSize();
    let { width, height } = size;

    // Calculate new dimensions (max 512px on long edge)
    const maxDimension = 512;
    let needsResize = false;

    if (width > maxDimension || height > maxDimension) {
      needsResize = true;
      if (width > height) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }
    }

    // Resize if needed
    const finalImage = needsResize ? image.resize({ width, height }) : image;

    // Convert to PNG and then to base64
    const pngBuffer = finalImage.toPNG();
    const base64Data = pngBuffer.toString('base64');

    return {
      base64: base64Data,
      width,
      height,
      originalWidth: size.width,
      originalHeight: size.height,
      format: 'png'
    };
  }

  /**
   * Build LLM prompt from query and context
   */
  _buildPrompt(query, contextItems) {
    let prompt = `You are an AI assistant analyzing web content and documents.
The user has asked the following question:

QUESTION:
${query}

CONTEXT:
Here is the content from the browser tabs and documents the user is analyzing:

`;

    contextItems.forEach((item, index) => {
      prompt += `\n--- TAB ${index + 1}: ${item.title || 'Untitled'} ---\n`;
      prompt += `URL: ${item.url}\n`;
      prompt += `Type: ${item.type}\n`;

      if (item.dom) {
        // Format HTML DOM data
        prompt += `\nTitle: ${item.dom.title || 'N/A'}\n`;
        if (item.dom.mainContent) {
          prompt += `\nMain Content:\n${item.dom.mainContent}\n`;
        }
        if (item.dom.headings && item.dom.headings.length > 0) {
          prompt += `\nHeadings:\n${item.dom.headings.map((h) => `${h.level}: ${h.text}`).join('\n')}\n`;
        }
        if (item.dom.paragraphs && item.dom.paragraphs.length > 0) {
          prompt += `\nParagraphs:\n${item.dom.paragraphs
            .map((p) => p.text)
            .slice(0, 5)
            .join('\n')}\n`;
        }

        // Include media information (always present now)
        if (item.dom.media) {
          if (item.dom.media.images && item.dom.media.images.length > 0) {
            prompt += `\nImages (${item.dom.media.count.images}):\n`;
            item.dom.media.images.forEach((img, idx) => {
              prompt += `  ${idx + 1}. ${img.alt || 'No alt text'} - ${img.src}\n`;
              if (img.title) prompt += `     Title: ${img.title}\n`;
            });
          }
          if (item.dom.media.videos && item.dom.media.videos.length > 0) {
            prompt += `\nVideos (${item.dom.media.count.videos}):\n`;
            item.dom.media.videos.forEach((video, idx) => {
              prompt += `  ${idx + 1}. ${video.src || video.poster || 'Video element'}\n`;
            });
          }
        }

        // Include screenshot if available
        if (item.screenshot) {
          prompt += `\nScreenshot:\n`;
          prompt += `  Dimensions: ${item.screenshot.width}x${item.screenshot.height} (original: ${item.screenshot.originalWidth}x${item.screenshot.originalHeight})\n`;
          prompt += `  Format: PNG (base64 encoded)\n`;
          prompt += `  Data: data:image/png;base64,${item.screenshot.base64}\n`;
          prompt += `  Note: This is a visual snapshot of the page as rendered in the browser.\n`;
        }
      } else if (item.content) {
        prompt += `\nContent:\n${item.content}\n`;
      }

      if (item.error) {
        prompt += `\nNote: ${item.error}\n`;
      }
      if (item.screenshotError) {
        prompt += `\nScreenshot Error: ${item.screenshotError}\n`;
      }
    });

    prompt += `\n--- END OF CONTEXT ---\n

Based on the above context, please provide a comprehensive answer to the user's question.
Focus on information found in the provided content when possible.`;

    return prompt;
  }

  /**
   * Send query to LLM API (local or remote) using the selected provider
   */
  async _queryRemoteLLM(prompt, apiKey, provider = 'openai', model = null, includeMedia = false, customEndpoint = null) {
    try {
      // Create provider instance with optional custom endpoint
      const config = {
        apiKey,
        model
      };

      // Add custom endpoint if provided
      if (customEndpoint) {
        config.baseUrl = customEndpoint;
      }

      const providerInstance = ProviderFactory.createProvider(provider, config);

      this.currentProvider = providerInstance;

      // Generate completion using the provider
      // Note: For vision models, image URLs are included in the prompt text
      // Future enhancement: Use multimodal message format for proper vision API support
      const response = await providerInstance.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 2000
      });

      // Handle both old (string) and new (object) response formats
      if (typeof response === 'string') {
        return {
          text: response,
          usage: {}
        };
      }

      return response;
    } catch (error) {
      console.error('Error querying LLM API:', error);
      throw error;
    }
  }

  /**
   * Add request to history for logging/debugging
   */
  _addToHistory(entry) {
    this.requestHistory.push(entry);

    // Keep only recent history
    if (this.requestHistory.length > this.maxHistory) {
      this.requestHistory.shift();
    }
  }

  /**
   * Get information about the browser environment for LLM context
   */
  getBrowserExplanation() {
    return {
      type: 'Electron WebContentsView',
      capabilities: ['navigate', 'extract_dom', 'execute_js', 'pdf_extraction'],
      constraints: ['async_only', 'no_synchronous_dom', 'ipc_required', 'process_isolated'],
      activeViews: this.contentViews.size,
      viewIds: Array.from(this.contentViews.keys())
    };
  }

  /**
   * Get request history for debugging
   */
  getHistory(limit = 10) {
    return this.requestHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.requestHistory = [];
  }

  /**
   * Get available providers and models
   */
  getAvailableProviders() {
    return {
      providers: PROVIDERS,
      models: MODELS
    };
  }

  /**
   * Get supported providers list
   */
  getSupportedProviders() {
    return ProviderFactory.getSupportedProviders();
  }
}

module.exports = LLMOrchestrator;

/**
 * LLM Orchestrator Service
 * Manages LLM API interactions and content analysis
 * Coordinates extraction from multiple WebContentsView instances
 */

const ProviderFactory = require('../providers/provider-factory');
const { PROVIDERS, MODELS, OPTIONAL_API_KEY_PROVIDERS } = require('../providers/models');
const ScreenshotService = require('./screenshot-service');
const { createErrorResult } = require('../utils');

class LLMOrchestrator {
  constructor() {
    this.contentViews = new Map();
    this.tabManager = null;
    this.windowManager = null;
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
   * Set reference to tab manager (called from main.js)
   */
  setTabManager(tabManager) {
    this.tabManager = tabManager;
  }

  /**
   * Set reference to window manager (called from main.js)
   */
  setWindowManager(windowManager) {
    this.windowManager = windowManager;
  }

  /**
   * Retrieve tab data from UI process for tabs that don't have WebContentsView instances
   * (e.g., notes tabs, conversation tabs)
   */
  async _getTabDataFromUI(tabId) {
    if (!this.windowManager) {
      console.warn('Window manager not available, cannot retrieve UI tab data');
      return null;
    }

    const chatView = this.windowManager.getChatView();
    if (!chatView || !chatView.webContents) {
      console.warn('Chat view not available, cannot retrieve UI tab data');
      return null;
    }

    try {
      // Execute JavaScript in the UI process to retrieve tab data
      const tabData = await chatView.webContents.executeJavaScript(`
        (function() {
          // Access the global state object from the UI
          if (typeof state === 'undefined' || !state.activeTabs) {
            return null;
          }

          const tab = state.activeTabs.get('${tabId}');
          if (!tab) {
            return null;
          }

          // Return tab data as a plain object (not a Map)
          return {
            type: tab.type,
            id: tab.id,
            title: tab.title,
            htmlContent: tab.htmlContent,
            userMessage: tab.userMessage,
            assistantMessage: tab.assistantMessage,
            content: tab.content,
            timestamp: tab.timestamp
          };
        })();
      `);

      return tabData;
    } catch (error) {
      console.error(`Failed to retrieve tab data from UI for tab ${tabId}:`, error);
      return null;
    }
  }

  /**
   * Analyze content from one or more tabs using LLM
   */
  async analyzeContent(query, tabIds, apiKey, provider = 'openai', model = null, includeMedia = false, customEndpoint = null, fullText = false) {
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
      const contextItems = await this._extractContextFromTabs(tabIds, { includeMedia, fullText });

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
      return createErrorResult(error);
    }
  }

  /**
   * Analyze content with streaming response
   * Yields text chunks as they arrive from the LLM
   * @param {string} query - User's question
   * @param {Array<number>} tabIds - IDs of tabs to analyze
   * @param {string} apiKey - API key for the provider
   * @param {string} provider - Provider name (e.g., 'fireworks', 'openai')
   * @param {string} model - Model name (may include deployment ID for Fireworks)
   * @param {boolean} includeMedia - Whether to include images in context
   * @param {string} customEndpoint - Custom endpoint for local providers
   * @param {boolean} fullTextExtraction - Whether to extract full visible text without limits
   * @returns {AsyncGenerator<{type: string, content?: string, metadata?: Object}>}
   */
  async *analyzeContentStreaming(query, tabIds, apiKey, provider = 'openai', model = null, includeMedia = false, customEndpoint = null, fullTextExtraction = false) {
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
      const contextItems = await this._extractContextFromTabs(tabIds, { includeMedia, fullText: fullTextExtraction });

      if (contextItems.length === 0) {
        throw new Error('No content available from specified tabs');
      }

      // Build the LLM prompt with extracted content
      const prompt = this._buildPrompt(query, contextItems);

      // Track latency
      const startTime = Date.now();

      // Stream from LLM API (local or remote)
      let fullText = '';
      let chunkCount = 0;

      for await (const chunk of this._queryRemoteLLMStreaming(prompt, apiKey, provider, model, includeMedia, customEndpoint)) {
        fullText += chunk;
        chunkCount++;
        yield { type: 'chunk', content: chunk };
      }

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
        responseLength: fullText.length,
        latencyMs,
        streaming: true,
        chunkCount
      });

      // Yield completion metadata
      yield {
        type: 'complete',
        metadata: {
          success: true,
          contextSize: contextItems.length,
          provider,
          model,
          latencyMs,
          tokensUsed: Math.ceil(prompt.length / 4) + Math.ceil(fullText.length / 4),
          chunkCount
        }
      };
    } catch (error) {
      console.error('Error analyzing content (streaming):', error);
      yield {
        type: 'error',
        error: {
          message: error.message,
          code: error.code || 'STREAM_ERROR'
        }
      };
    }
  }

  /**
   * Extract content from specified tabs
   */
  async _extractContextFromTabs(tabIds, options = {}) {
    const contextItems = [];
    const { includeMedia = false, fullText = false } = options;

    for (const tabId of tabIds) {
      try {
        const view = this.contentViews.get(tabId);
        if (!view) {
          // Tab not found in contentViews - it might be a notes or conversation tab
          // Try to retrieve it from the UI process
          const uiTabData = await this._getTabDataFromUI(tabId);

          if (uiTabData) {
            // Handle notes and conversation tabs
            if (uiTabData.type === 'notes') {
              // Notes tab: extract the text content
              contextItems.push({
                tabId,
                type: 'notes',
                title: uiTabData.title,
                url: `notes://${uiTabData.id}`,
                content: uiTabData.content || ''
              });
            } else if (uiTabData.type === 'conversation') {
              // Conversation tab: include both user message and assistant response
              const conversationContent = [
                'USER MESSAGE:',
                uiTabData.userMessage || '',
                '',
                'ASSISTANT RESPONSE:',
                uiTabData.assistantMessage || ''
              ].join('\n');

              contextItems.push({
                tabId,
                type: 'conversation',
                title: uiTabData.title,
                url: `conversation://${uiTabData.id}`,
                content: conversationContent
              });
            }
          } else {
            console.warn(`Tab ${tabId} not found in contentViews or UI state`);
          }
          continue;
        }

        // Check if this tab has stored file content (uploaded files)
        const metadata = this.tabManager ? this.tabManager.getTabMetadata(tabId) : null;
        if (metadata && metadata.isUploadedFile) {
          // Use stored file content for uploaded files
          contextItems.push({
            tabId,
            type: metadata.fileType,
            title: metadata.fileName,
            url: `file://${metadata.fileName}`,
            content: metadata.fileContent
          });
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
            // Validate options to prevent injection
            const safeOptions = {
              includeMedia: Boolean(options?.includeMedia),
              fullText: Boolean(options?.fullText)
            };
            const domData = await view.webContents.executeJavaScript(
              `window.contentAPI ? window.contentAPI.getSerializedDOM(${JSON.stringify(safeOptions)}) : null`
            );

            const contextItem = {
              tabId,
              type: 'html',
              title: domData?.title || title,
              url: domData?.url || url,
              dom: domData
            };

            // Capture screenshot if media is enabled
            if (includeMedia && domData) {
              try {
                const screenshot = await ScreenshotService.captureAndResize(view);
                contextItem.screenshot = screenshot;
              } catch (screenshotError) {
                console.warn(`Failed to capture screenshot for tab ${tabId}:`, screenshotError);
                contextItem.screenshotError = screenshotError.message;
              }
            }

            // Always add the item, even if domData is null
            // (LLM can still use basic title/url information)
            contextItems.push(contextItem);
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
   * Build LLM prompt from query and context
   */
  _buildPrompt(query, contextItems) {
    const parts = [
      'You are an AI assistant analyzing web content and documents.',
      'The user has asked the following question:',
      '',
      'QUESTION:',
      query,
      '',
      'CONTEXT:',
      'Here is the content from the browser tabs and documents the user is analyzing:',
      ''
    ];

    contextItems.forEach((item, index) => {
      parts.push(`\n--- TAB ${index + 1}: ${item.title || 'Untitled'} ---`);
      parts.push(`URL: ${item.url}`);
      parts.push(`Type: ${item.type}`);

      if (item.dom) {
        this._addDOMContent(parts, item.dom);
        this._addMediaContent(parts, item.dom.media);
        this._addScreenshotContent(parts, item.screenshot);
      } else if (item.content) {
        parts.push(`\nContent:\n${item.content}`);
      }

      if (item.error) parts.push(`\nNote: ${item.error}`);
      if (item.screenshotError) parts.push(`\nScreenshot Error: ${item.screenshotError}`);
    });

    parts.push('\n--- END OF CONTEXT ---\n');
    parts.push('');
    parts.push('Based on the above context, please provide a comprehensive answer to the user\'s question.');
    parts.push('Focus on information found in the provided content when possible.');

    return parts.join('\n');
  }

  /**
   * Add DOM content to prompt parts
   */
  _addDOMContent(parts, dom) {
    parts.push(`\nTitle: ${dom.title || 'N/A'}`);

    if (dom.mainContent) {
      parts.push(`\nMain Content:\n${dom.mainContent}`);
    }

    if (dom.headings?.length > 0) {
      const headings = dom.headings.map(h => `${h.level}: ${h.text}`).join('\n');
      parts.push(`\nHeadings:\n${headings}`);
    }

    if (dom.paragraphs?.length > 0) {
      // Include all extracted paragraphs (up to 100) instead of just 5
      const paragraphs = dom.paragraphs.map(p => p.text).join('\n');
      parts.push(`\nParagraphs:\n${paragraphs}`);
    }
  }

  /**
   * Add media content to prompt parts
   */
  _addMediaContent(parts, media) {
    if (!media) return;

    if (media.images?.length > 0) {
      parts.push(`\nImages (${media.count.images}):`);
      media.images.forEach((img, idx) => {
        parts.push(`  ${idx + 1}. ${img.alt || 'No alt text'} - ${img.src}`);
        if (img.title) parts.push(`     Title: ${img.title}`);
      });
    }

    if (media.videos?.length > 0) {
      parts.push(`\nVideos (${media.count.videos}):`);
      media.videos.forEach((video, idx) => {
        parts.push(`  ${idx + 1}. ${video.src || video.poster || 'Video element'}`);
      });
    }
  }

  /**
   * Add screenshot content to prompt parts
   */
  _addScreenshotContent(parts, screenshot) {
    if (!screenshot) return;

    parts.push('\nScreenshot:');
    parts.push(`  Dimensions: ${screenshot.width}x${screenshot.height} (original: ${screenshot.originalWidth}x${screenshot.originalHeight})`);
    parts.push('  Format: PNG (base64 encoded)');
    parts.push(`  Data: data:image/png;base64,${screenshot.base64}`);
    parts.push('  Note: This is a visual snapshot of the page as rendered in the browser.');
  }

  /**
   * Send query to LLM API (local or remote) using the selected provider
   */
  async _queryRemoteLLM(prompt, apiKey, provider = 'openai', model = null, includeMedia = false, customEndpoint = null) {
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
  }

  /**
   * Stream query to LLM API (local or remote) using the selected provider
   * @returns {AsyncGenerator<string>} - Stream of text chunks
   */
  async *_queryRemoteLLMStreaming(prompt, apiKey, provider = 'openai', model = null, includeMedia = false, customEndpoint = null) {
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

    // Generate streaming completion using the provider
    // Note: For vision models, image URLs are included in the prompt text
    // Future enhancement: Use multimodal message format for proper vision API support
    for await (const chunk of providerInstance.generateStreamingCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 2000
    })) {
      yield chunk;
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

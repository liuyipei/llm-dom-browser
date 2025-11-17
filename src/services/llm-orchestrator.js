/**
 * LLM Orchestrator Service
 * Manages LLM API interactions and content analysis
 * Coordinates extraction from multiple WebContentsView instances
 */

class LLMOrchestrator {
  constructor() {
    this.contentViews = new Map();
    this.llmClient = null;
    this.requestHistory = [];
    this.maxHistory = 50;
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
  async analyzeContent(query, tabIds, apiKey) {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid query');
      }

      if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('API key is required');
      }

      if (!Array.isArray(tabIds)) {
        throw new Error('Tab IDs must be an array');
      }

      // Extract content from all specified tabs
      const contextItems = await this._extractContextFromTabs(tabIds);

      if (contextItems.length === 0) {
        throw new Error('No content available from specified tabs');
      }

      // Build the LLM prompt with extracted content
      const prompt = this._buildPrompt(query, contextItems);

      // Send to remote LLM API
      const response = await this._queryRemoteLLM(prompt, apiKey);

      // Store in history
      this._addToHistory({
        timestamp: new Date().toISOString(),
        query,
        tabIds,
        contextLength: prompt.length,
        responseLength: response.length
      });

      return {
        success: true,
        response,
        contextSize: contextItems.length,
        tokensUsed: Math.ceil(prompt.length / 4) // Rough estimate
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
  async _extractContextFromTabs(tabIds) {
    const contextItems = [];

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
              'window.contentAPI ? window.contentAPI.getSerializedDOM() : null'
            );

            if (domData) {
              contextItems.push({
                tabId,
                type: 'html',
                title: domData.title || title,
                url: domData.url || url,
                dom: domData
              });
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
      } else if (item.content) {
        prompt += `\nContent:\n${item.content}\n`;
      }

      if (item.error) {
        prompt += `\nNote: ${item.error}\n`;
      }
    });

    prompt += `\n--- END OF CONTEXT ---\n

Based on the above context, please provide a comprehensive answer to the user's question.
Focus on information found in the provided content when possible.`;

    return prompt;
  }

  /**
   * Send query to remote LLM API
   * Currently a placeholder - implement with actual API calls
   */
  async _queryRemoteLLM(prompt, apiKey) {
    try {
      // Placeholder implementation
      // In production, this would call actual LLM APIs (OpenAI, Anthropic, etc.)

      // Example: Using a remote API endpoint
      const apiEndpoint = process.env.LLM_API_ENDPOINT || 'https://api.example.com/query';

      // This is a mock response - replace with actual API call
      const mockResponse = `Based on the provided content, here's my analysis:

I've analyzed the content from your tabs. The information shows several key points:

1. The primary content discusses the topic at hand
2. Supporting information is available in multiple sections
3. Related resources are referenced throughout

To provide a more detailed response, I would need to process the actual content and connect it to your specific question.

[This is a mock response. Connect to a real LLM API by setting LLM_API_ENDPOINT environment variable]`;

      return mockResponse;

      // ACTUAL API CALL TEMPLATE (uncomment when ready):
      /*
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt,
          maxTokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || data.text || data.choices?.[0]?.text || '';
      */
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
}

module.exports = LLMOrchestrator;

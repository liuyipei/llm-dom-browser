/**
 * User action handlers
 * Handles opening tabs, uploading files, sending queries
 */

/**
 * Open tab helper (extracted from handleOpenTab)
 */
async function handleOpenTabUrl(url) {
  let finalUrl = url;
  if (!url.startsWith('http') && !url.startsWith('file')) {
    finalUrl = 'https://' + url;
  }

  const result = await window.electronAPI.openTab(finalUrl);
  const initialTitle = result.title || 'Loading...';
  state.activeTabs.set(result.id, { url: result.url, title: initialTitle });

  // Initialize last view time for new tab
  state.tabLastViewTime.set(result.id, Date.now());

  if (result.isActive) {
    state.activeTabId = result.id;
  }

  return result;
}

/**
 * Open a tab with URL
 */
async function handleOpenTab() {
  const url = urlInput.value.trim();
  if (!url) {
    updateStatus('Please enter a URL', 'error');
    return;
  }

  try {
    setLoading(true);
    updateStatus('Opening tab...');

    const result = await handleOpenTabUrl(url);
    console.log('[UI] Tab opened, result:', result);
    console.log('[UI] Active tabs after opening:', Array.from(state.activeTabs.entries()));
    addMessage(`✅ Opened: ${result.url}`, 'system');
    updateStatus('Tab opened successfully', 'success');
    urlInput.value = '';
    renderTabs();
    updateBookmarkButton();
  } catch (error) {
    updateStatus(`Error: ${error.message}`, 'error');
    addMessage(`❌ Error: ${error.message}`, 'system');
  } finally {
    setLoading(false);
  }
}

/**
 * Upload a file
 */
async function handleUploadFile() {
  try {
    // Show file open dialog
    const dialogResult = await window.electronAPI.showOpenDialog({
      title: 'Select file to upload',
      properties: ['openFile']
    });

    // Check if user canceled
    if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
      return;
    }

    const filePath = dialogResult.filePaths[0];
    const fileName = filePath.split(/[/\\]/).pop(); // Get filename from path

    setLoading(true);
    updateStatus('Uploading file...');

    const result = await window.electronAPI.uploadFile(filePath, fileName);

    // Add the new tab to active tabs
    state.activeTabs.set(result.tabId, {
      url: result.url || filePath,
      title: result.fileName,
      type: result.type
    });

    // Auto-select the tab so it's included in next LLM query
    state.selectedTabs.add(result.tabId);

    addMessage(`📄 Uploaded: ${fileName} (auto-selected for LLM)`, 'system');
    updateStatus('File uploaded successfully', 'success');
    renderTabs();
  } catch (error) {
    updateStatus(`Error: ${error.message}`, 'error');
    addMessage(`❌ Error: ${error.message}`, 'system');
  } finally {
    setLoading(false);
  }
}

/**
 * Send query to LLM
 */
async function handleSendQuery() {
  const query = queryInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const provider = providerSelect.value;
  let model = modelSelect.value || null;
  const tabIds = Array.from(state.selectedTabs);
  const includeMedia = includeMediaCheckbox.checked;
  const isLocal = window.AppConfig.LOCAL_PROVIDERS.includes(provider);
  const customEndpoint = isLocal ? endpointInput.value.trim() : null;

  // For Fireworks, append deployment ID if provided
  if (provider === 'fireworks') {
    const deploymentId = fireworksDeploymentInput.value.trim();
    if (deploymentId && model) {
      model = `${model}#${deploymentId}`;
      console.log(`Using Fireworks deployment: ${model}`);
    }
  }

  if (!query) {
    updateStatus('Please enter a question', 'error');
    return;
  }

  // API key is optional for local providers
  if (!isLocal && !apiKey) {
    updateStatus('Please enter API key', 'error');
    return;
  }

  if (tabIds.length === 0) {
    updateStatus('Please select at least one tab', 'error');
    return;
  }

  // Save API key and endpoint if applicable
  if (apiKey) {
    storage.saveApiKey(provider, apiKey);
  }
  if (isLocal && customEndpoint) {
    storage.saveEndpoint(provider, customEndpoint);
  }

  try {
    setLoading(true);
    updateStatus(`Analyzing content with ${provider}...`);

    // Store user message temporarily
    state.pendingConversation = {
      userMessage: query,
      estimatedTokens: estimateTokenCount(query),
      timestamp: Date.now()
    };

    const result = await window.electronAPI.queryLLM(query, tabIds, apiKey, provider, model, includeMedia, customEndpoint);

    if (result.success) {
      // Create conversation tab with both messages
      const stats = {
        latencyMs: result.latencyMs,
        usage: result.usage,
        tokensUsed: result.tokensUsed,
        model: result.model
      };

      // Collect source tab information
      const sourceTabs = tabIds.map(id => {
        const tab = state.activeTabs.get(id);
        return {
          id: id,
          title: tab ? tab.title : 'Unknown Tab',
          url: tab ? tab.url : ''
        };
      });

      const tabId = createConversationTab(query, result.response, stats, sourceTabs, includeMedia);

      // Add conversation summary to chat container (metadata only)
      const tab = state.activeTabs.get(tabId);
      addConversationToChat(
        tabId,
        tab.id,
        tab.userTokens,
        tab.assistantTokens,
        stats
      );

      updateStatus(
        `Response generated using ${result.provider}`,
        'success'
      );
    } else {
      updateStatus(`Error: ${result.error}`, 'error');
      addMessage(`❌ ${result.error}`, 'error');
      state.pendingConversation = null; // Clear pending on error
    }

    queryInput.value = '';
  } catch (error) {
    updateStatus(`Error: ${error.message}`, 'error');
    addMessage(`❌ ${error.message}`, 'error');
    state.pendingConversation = null; // Clear pending on error
  } finally {
    setLoading(false);
  }
}

/**
 * Send streaming query to LLM with live UI updates
 */
async function handleSendQueryStreaming() {
  const query = queryInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const provider = providerSelect.value;
  let model = modelSelect.value || null;
  const tabIds = Array.from(state.selectedTabs);
  const includeMedia = includeMediaCheckbox.checked;
  const isLocal = window.AppConfig.LOCAL_PROVIDERS.includes(provider);
  const customEndpoint = isLocal ? endpointInput.value.trim() : null;

  // For Fireworks, append deployment ID if provided
  if (provider === 'fireworks') {
    const deploymentId = fireworksDeploymentInput.value.trim();
    if (deploymentId && model) {
      model = `${model}#${deploymentId}`;
      console.log(`Using Fireworks deployment: ${model}`);
    }
  }

  if (!query) {
    updateStatus('Please enter a question', 'error');
    return;
  }

  // API key is optional for local providers
  if (!isLocal && !apiKey) {
    updateStatus('Please enter API key', 'error');
    return;
  }

  if (tabIds.length === 0) {
    updateStatus('Please select at least one tab', 'error');
    return;
  }

  // Save API key and endpoint if applicable
  if (apiKey) {
    storage.saveApiKey(provider, apiKey);
  }
  if (isLocal && customEndpoint) {
    storage.saveEndpoint(provider, customEndpoint);
  }

  try {
    setLoading(true);
    updateStatus(`Streaming response from ${provider}...`);

    // Store user message for tab creation
    state.pendingConversation = {
      userMessage: query,
      estimatedTokens: estimateTokenCount(query),
      timestamp: Date.now()
    };

    // Collect source tab information
    const sourceTabs = tabIds.map(id => {
      const tab = state.activeTabs.get(id);
      return {
        id: id,
        title: tab ? tab.title : 'Unknown Tab',
        url: tab ? tab.url : ''
      };
    });

    // Create conversation tab immediately with loading state
    const conversationTabId = createStreamingConversationTab(
      query,
      '⏳ Waiting for response...',
      { model, provider },
      sourceTabs,
      includeMedia
    );

    // Generate unique request ID
    const requestId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[Stream] Request ${requestId} started`);

    // Streaming state
    let streamedText = '';
    let chunkCount = 0;
    const startTime = Date.now();
    let lastRenderTime = 0;
    const RENDER_DEBOUNCE_MS = 80; // Render at most every 80ms

    // Debounced update function
    const updateTabContent = () => {
      const now = Date.now();
      if (now - lastRenderTime >= RENDER_DEBOUNCE_MS) {
        updateStreamingConversationTab(
          conversationTabId,
          streamedText + ' ▌', // Add blinking cursor
          { model, provider, streaming: true, chunkCount }
        );
        lastRenderTime = now;
      }
    };

    // Set up event listeners
    const unsubChunk = window.electronAPI.onLLMStreamChunk((data) => {
      if (data.requestId === requestId) {
        chunkCount++;
        streamedText += data.content;
        updateTabContent();
      }
    });

    const unsubComplete = window.electronAPI.onLLMStreamComplete((data) => {
      if (data.requestId === requestId) {
        const elapsed = Date.now() - startTime;
        console.log(`[Stream] Complete: ${chunkCount} chunks in ${elapsed}ms`);

        // Final update without cursor
        updateStreamingConversationTab(
          conversationTabId,
          streamedText,
          {
            model: data.metadata.model || model,
            provider: data.metadata.provider || provider,
            latencyMs: data.metadata.latencyMs || elapsed,
            tokensUsed: data.metadata.tokensUsed,
            streaming: false,
            chunkCount
          }
        );

        // Add conversation summary to chat
        const tab = state.activeTabs.get(conversationTabId);
        addConversationToChat(
          conversationTabId,
          tab.id,
          tab.userTokens,
          tab.assistantTokens,
          {
            latencyMs: data.metadata.latencyMs,
            usage: {},
            model: data.metadata.model
          }
        );

        updateStatus(`Response complete: ${chunkCount} chunks in ${(elapsed/1000).toFixed(1)}s`, 'success');

        // Clean up
        unsubChunk();
        unsubComplete();
        unsubError();
        setLoading(false);
        queryInput.value = '';
      }
    });

    const unsubError = window.electronAPI.onLLMStreamError((data) => {
      if (data.requestId === requestId) {
        console.error(`[Stream] Error:`, data.error);

        // Update tab with error message
        const errorMessage = streamedText
          ? streamedText + `\n\n---\n❌ **Error:** ${data.error.message}`
          : `❌ **Error:** ${data.error.message}`;

        updateStreamingConversationTab(
          conversationTabId,
          errorMessage,
          { model, provider, streaming: false, error: true }
        );

        updateStatus(`Error: ${data.error.message}`, 'error');
        addMessage(`❌ ${data.error.message}`, 'error');

        // Clean up
        unsubChunk();
        unsubComplete();
        unsubError();
        setLoading(false);
      }
    });

    // Start the stream
    window.electronAPI.startLLMStream(
      requestId,
      query,
      tabIds,
      apiKey,
      provider,
      model,
      includeMedia,
      customEndpoint
    );

  } catch (error) {
    console.error(`[Stream] Exception:`, error);
    updateStatus(`Error: ${error.message}`, 'error');
    addMessage(`❌ ${error.message}`, 'error');
    setLoading(false);
    state.pendingConversation = null;
  }
}

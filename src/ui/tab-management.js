/**
 * Tab management
 * Handles tab creation, switching, closing, sorting, and rendering
 */

/**
 * Create a conversation tab with user message and assistant response
 * @param {string} userMessage - The user's message
 * @param {string} assistantMessage - The assistant's response
 * @param {Object} stats - Stats from the LLM response
 * @param {Array} sourceTabs - Array of source tab objects with id, title, and url
 * @param {boolean} includeMedia - Whether images were included in the query
 * @returns {string} - The created tab ID
 */
function createConversationTab(userMessage, assistantMessage, stats = null, sourceTabs = [], includeMedia = false) {
  // Increment conversation counter
  state.conversationCounter++;

  // Create tab ID
  const tabId = `conversation_${state.conversationCounter}`;

  // Extract token counts
  const userTokens = state.pendingConversation?.estimatedTokens || estimateTokenCount(userMessage);
  let assistantTokens = estimateTokenCount(assistantMessage);

  // Use actual token count from API if available
  if (stats?.usage) {
    if (stats.usage.output_tokens !== undefined) {
      assistantTokens = stats.usage.output_tokens;
    } else if (stats.usage.completion_tokens !== undefined) {
      assistantTokens = stats.usage.completion_tokens;
    }
  }

  // Create tab title: first words from user message + ID + token counts
  const firstWords = getFirstWords(userMessage, 4);
  const tabTitle = `${firstWords}... [${state.conversationCounter}] (${userTokens}↑ / ${assistantTokens}↓)`;

  // Generate HTML for the conversation
  const conversationData = {
    id: state.conversationCounter,
    userMessage,
    userTokens,
    assistantMessage,
    assistantTokens,
    stats,
    sourceTabs,
    includeMedia,
    timestamp: Date.now()
  };

  const htmlContent = generateConversationHTML(conversationData);

  // Store tab data
  const tabData = {
    type: 'conversation',
    id: state.conversationCounter,
    title: tabTitle,
    htmlContent: htmlContent,
    userMessage,
    assistantMessage,
    userTokens,
    assistantTokens,
    stats,
    sourceTabs,
    includeMedia,
    timestamp: Date.now()
  };

  state.activeTabs.set(tabId, tabData);
  state.tabLastViewTime.set(tabId, Date.now());

  // Add to tab order
  state.tabOrder.push(tabId);

  // Render tabs to show the new conversation tab
  renderTabs();

  // Clear pending conversation
  state.pendingConversation = null;

  return tabId;
}

/**
 * Create a conversation tab with streaming support (initially in loading state)
 * @param {string} userMessage - The user's message
 * @param {string} initialAssistantMessage - Initial placeholder message
 * @param {Object} stats - Partial stats (model, provider)
 * @param {Array} sourceTabs - Array of source tab objects
 * @param {boolean} includeMedia - Whether images were included
 * @returns {string} - The created tab ID
 */
function createStreamingConversationTab(userMessage, initialAssistantMessage, stats = {}, sourceTabs = [], includeMedia = false) {
  // Increment conversation counter
  state.conversationCounter++;

  // Create tab ID
  const tabId = `conversation_${state.conversationCounter}`;

  // Extract token counts
  const userTokens = state.pendingConversation?.estimatedTokens || estimateTokenCount(userMessage);
  const assistantTokens = estimateTokenCount(initialAssistantMessage);

  // Create tab title: first words from user message + ID + token counts
  const firstWords = getFirstWords(userMessage, 4);
  const tabTitle = `${firstWords}... [${state.conversationCounter}] (${userTokens}↑ / ...↓)`;

  // Generate HTML for the conversation (with streaming placeholder)
  const conversationData = {
    id: state.conversationCounter,
    userMessage,
    userTokens,
    assistantMessage: initialAssistantMessage,
    assistantTokens,
    stats: stats,
    sourceTabs,
    includeMedia,
    timestamp: Date.now()
  };

  const htmlContent = generateConversationHTML(conversationData);

  // Store tab data
  const tabData = {
    type: 'conversation',
    id: state.conversationCounter,
    title: tabTitle,
    htmlContent: htmlContent,
    userMessage,
    assistantMessage: initialAssistantMessage,
    userTokens,
    assistantTokens,
    stats,
    sourceTabs,
    includeMedia,
    timestamp: Date.now(),
    streaming: true  // Mark as streaming
  };

  state.activeTabs.set(tabId, tabData);
  state.tabLastViewTime.set(tabId, Date.now());

  // Add to tab order
  state.tabOrder.push(tabId);

  // Render tabs to show the new conversation tab
  renderTabs();

  return tabId;
}

/**
 * Update a streaming conversation tab with new content
 * @param {string} tabId - The tab ID to update
 * @param {string} assistantMessage - Updated assistant message
 * @param {Object} stats - Updated stats
 */
function updateStreamingConversationTab(tabId, assistantMessage, stats = {}) {
  const tab = state.activeTabs.get(tabId);
  if (!tab || tab.type !== 'conversation') {
    console.error('Tab not found or not a conversation tab:', tabId);
    return;
  }

  // Update assistant message and token count
  const assistantTokens = estimateTokenCount(assistantMessage);

  // Update tab title with current token counts
  const firstWords = getFirstWords(tab.userMessage, 4);
  const streamingIndicator = stats.streaming ? ' 🔄' : '';
  const tabTitle = `${firstWords}... [${tab.id}] (${tab.userTokens}↑ / ${assistantTokens}↓)${streamingIndicator}`;

  // Update conversation data
  const conversationData = {
    id: tab.id,
    userMessage: tab.userMessage,
    userTokens: tab.userTokens,
    assistantMessage,
    assistantTokens,
    stats: { ...tab.stats, ...stats },
    sourceTabs: tab.sourceTabs,
    includeMedia: tab.includeMedia,
    timestamp: tab.timestamp
  };

  const htmlContent = generateConversationHTML(conversationData);

  // Update tab data
  tab.title = tabTitle;
  tab.htmlContent = htmlContent;
  tab.assistantMessage = assistantMessage;
  tab.assistantTokens = assistantTokens;
  tab.stats = { ...tab.stats, ...stats };
  tab.streaming = stats.streaming || false;

  // Re-render tabs to show updated title (with streaming indicator)
  renderTabs();

  // Clear pending conversation when streaming completes
  if (!stats.streaming) {
    state.pendingConversation = null;
  }
}

/**
 * Create a new notes tab for editing text
 * @param {string} initialContent - Initial content for the notes (optional)
 * @returns {string} The created tab ID
 */
function createNotesTab(initialContent = '') {
  // Increment notes counter
  state.notesCounter++;

  // Create tab ID
  const tabId = `notes_${state.notesCounter}`;

  // Create tab title
  const tabTitle = `Notes ${state.notesCounter}`;

  // Generate HTML for the notes editor
  const htmlContent = generateNotesHTML(state.notesCounter, initialContent);

  // Store tab data
  const tabData = {
    type: 'notes',
    id: state.notesCounter,
    title: tabTitle,
    htmlContent: htmlContent,
    content: initialContent,
    timestamp: Date.now()
  };

  state.activeTabs.set(tabId, tabData);
  state.tabLastViewTime.set(tabId, Date.now());

  // Add to tab order
  state.tabOrder.push(tabId);

  // Render tabs to show the new notes tab
  renderTabs();

  return tabId;
}

/**
 * Close a tab
 */
async function closeTab(tabId) {
  try {
    const tab = state.activeTabs.get(tabId);
    if (!tab) {
      console.error('Tab not found:', tabId);
      return;
    }

    // Handle conversation tabs (no need to call Electron API)
    if (tab.type === 'conversation') {
      state.activeTabs.delete(tabId);
      state.selectedTabs.delete(tabId);
      state.tabLastViewTime.delete(tabId);
      state.tabOrder = state.tabOrder.filter(id => id !== tabId);
      renderTabs();
      return;
    }

    // Handle notes tabs (no need to call Electron API)
    if (tab.type === 'notes') {
      state.activeTabs.delete(tabId);
      state.selectedTabs.delete(tabId);
      state.tabLastViewTime.delete(tabId);
      state.tabOrder = state.tabOrder.filter(id => id !== tabId);
      renderTabs();
      return;
    }

    // Handle URL tabs
    const closedTabInfo = {
      url: tab.url,
      title: tab.title,
      timestamp: Date.now()
    };
    state.closedTabs.push(closedTabInfo);
    // Keep only last 20
    if (state.closedTabs.length > 20) {
      state.closedTabs.shift();
    }
    tabPersistence.save(state);

    await window.electronAPI.closeTab(tabId);
    state.activeTabs.delete(tabId);
    state.selectedTabs.delete(tabId);
    addMessage(`Closed tab`, 'system');
    renderTabs();
  } catch (error) {
    updateStatus(`Error closing tab: ${error.message}`, 'error');
  }
}

/**
 * Switch to a tab (make it visible)
 */
async function switchTab(tabId) {
  const tab = state.activeTabs.get(tabId);
  if (!tab) {
    console.error('Tab not found:', tabId);
    return;
  }

  // Handle conversation tabs - open HTML content in browser
  if (tab.type === 'conversation') {
    try {
      // Create a data URL from the HTML content
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(tab.htmlContent);

      // Open it as a new browser tab
      await window.electronAPI.openTab(dataUrl);

      // Track last view time for sorting
      state.tabLastViewTime.set(tabId, Date.now());
      updateStatus('Conversation opened in browser', 'success');
    } catch (error) {
      console.error('Error opening conversation:', error);
      updateStatus(`Error opening conversation: ${error.message}`, 'error');
    }
    return;
  }

  // Handle notes tabs - open HTML content in browser
  if (tab.type === 'notes') {
    try {
      // Create a data URL from the HTML content
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(tab.htmlContent);

      // Open it as a new browser tab
      await window.electronAPI.openTab(dataUrl);

      // Track last view time for sorting
      state.tabLastViewTime.set(tabId, Date.now());
      updateStatus('Notes tab opened in browser', 'success');
    } catch (error) {
      console.error('Error opening notes tab:', error);
      updateStatus(`Error opening notes tab: ${error.message}`, 'error');
    }
    return;
  }

  // Handle URL tabs
  try {
    await window.electronAPI.switchTab(tabId);
    // Track last view time for sorting
    state.tabLastViewTime.set(tabId, Date.now());
    // The active tab will be updated via the onActiveTabChanged listener
    updateBookmarkButton();
  } catch (error) {
    console.error('Error switching tab:', error);
    updateStatus(`Error switching tab: ${error.message}`, 'error');
  }
}

/**
 * Toggle tab selection for LLM query
 */
function toggleTabSelection(tabId) {
  if (state.selectedTabs.has(tabId)) {
    state.selectedTabs.delete(tabId);
  } else {
    state.selectedTabs.add(tabId);
  }
  renderTabs();
}

/**
 * Set tab sort mode
 */
function setSortMode(mode) {
  // If clicking the same mode, toggle direction
  if (state.sortMode === mode && mode !== 'manual') {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // Switching to a new mode, set default direction
    state.sortMode = mode;
    if (mode === 'time') {
      state.sortDirection = 'desc'; // Most recent first
    } else if (mode === 'url') {
      state.sortDirection = 'asc'; // A-Z
    }
  }

  // Update button states
  sortByUrlBtn.classList.remove('active');
  sortByTimeBtn.classList.remove('active');
  sortManualBtn.classList.remove('active');

  if (mode === 'url') {
    sortByUrlBtn.classList.add('active');
  } else if (mode === 'time') {
    sortByTimeBtn.classList.add('active');
  } else {
    sortManualBtn.classList.add('active');
  }

  updateSortButtonLabels();
  renderTabs();
}

/**
 * Update sort button labels to show current direction
 */
function updateSortButtonLabels() {
  if (state.sortMode === 'url') {
    const arrow = state.sortDirection === 'asc' ? '↑' : '↓';
    sortByUrlBtn.textContent = `Sort by URL ${arrow}`;
    sortByTimeBtn.textContent = 'Sort by Time';
  } else if (state.sortMode === 'time') {
    const arrow = state.sortDirection === 'desc' ? '↓' : '↑';
    sortByTimeBtn.textContent = `Sort by Time ${arrow}`;
    sortByUrlBtn.textContent = 'Sort by URL';
  } else {
    sortByUrlBtn.textContent = 'Sort by URL';
    sortByTimeBtn.textContent = 'Sort by Time';
  }
}

/**
 * Sort tabs based on current sort mode
 */
function getSortedTabOrder() {
  let sorted = [...state.tabOrder];

  if (state.sortMode === 'url') {
    // Sort alphabetically by URL (supports both directions)
    sorted.sort((a, b) => {
      const tabA = state.activeTabs.get(a);
      const tabB = state.activeTabs.get(b);
      if (!tabA || !tabB) return 0;
      const comparison = (tabA.url || '').localeCompare(tabB.url || '');
      return state.sortDirection === 'asc' ? comparison : -comparison;
    });
  } else if (state.sortMode === 'time') {
    // Sort by time (most recent first = desc, oldest first = asc)
    sorted.sort((a, b) => {
      const timeA = state.tabLastViewTime.get(a) || 0;
      const timeB = state.tabLastViewTime.get(b) || 0;
      const comparison = timeB - timeA; // Base comparison (newest first)
      return state.sortDirection === 'desc' ? comparison : -comparison;
    });
  }
  // For 'manual' mode, use the existing order

  return sorted;
}

/**
 * Render tabs list
 */
function renderTabs() {
  tabList.innerHTML = '';

  // Update tab order if needed
  if (state.tabOrder.length === 0) {
    state.tabOrder = Array.from(state.activeTabs.keys());
  } else {
    // Remove closed tabs from order
    state.tabOrder = state.tabOrder.filter(id => state.activeTabs.has(id));
    // Add new tabs to order
    state.activeTabs.forEach((tab, tabId) => {
      if (!state.tabOrder.includes(tabId)) {
        state.tabOrder.push(tabId);
        // Initialize last view time for new tabs
        if (!state.tabLastViewTime.has(tabId)) {
          state.tabLastViewTime.set(tabId, Date.now());
        }
      }
    });
  }

  // Get sorted order based on current sort mode
  const displayOrder = getSortedTabOrder();

  // Render all tabs in display order
  displayOrder.forEach(tabId => {
    if (state.activeTabs.has(tabId)) {
      renderTabElement(tabId);
    }
  });

  // Render recently closed tabs button
  if (state.closedTabs.length > 0) {
    renderRecentlyClosedButton();
  }
}

/**
 * Render a single tab element
 */
function renderTabElement(tabId) {
  const tab = state.activeTabs.get(tabId);
  if (!tab) return;

  const isSelected = state.selectedTabs.has(tabId);
  const isCurrent = state.activeTabId === tabId;
  const isConversationTab = tab.type === 'conversation';
  const isNotesTab = tab.type === 'notes';
  const tabEl = document.createElement('div');

  // Add classes for visual states
  const classes = ['tab-item'];
  if (isSelected) classes.push('active');
  if (isCurrent) classes.push('current');
  if (isConversationTab) classes.push('conversation-tab');
  if (isNotesTab) classes.push('notes-tab');
  tabEl.className = classes.join(' ');
  tabEl.draggable = true;
  tabEl.dataset.tabId = tabId;

  // Add visual indicator for conversation tabs
  if (isConversationTab) {
    tabEl.style.borderLeft = '3px solid #a371f7';
  }

  // Add visual indicator for notes tabs
  if (isNotesTab) {
    tabEl.style.borderLeft = '3px solid #3498db';
  }

  // Create checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isSelected;
  checkbox.style.cursor = 'pointer';
  checkbox.title = isSelected ? 'Remove from LLM query' : 'Include in LLM query';
  checkbox.draggable = false; // Prevent drag interference
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTabSelection(tabId);
  });

  // Create title span
  const title = tab.title || 'Untitled';
  const currentIndicator = isCurrent ? '👁 ' : '';
  const conversationIndicator = isConversationTab ? '💬 ' : '';
  const notesIndicator = isNotesTab ? '📝 ' : '';
  const titleSpan = document.createElement('span');
  titleSpan.className = 'tab-title';
  titleSpan.textContent = `${currentIndicator}${conversationIndicator}${notesIndicator}${title}`;
  titleSpan.style.fontSize = (isConversationTab || isNotesTab) ? '11px' : '12px';

  // Create clickable div for tab switching
  const clickableDiv = document.createElement('div');
  clickableDiv.className = 'clickable-area';
  clickableDiv.style.cssText = 'flex: 1; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 2px;';
  clickableDiv.title = isConversationTab ? 'Click to view conversation in browser' : (isNotesTab ? 'Click to view notes editor in browser' : (isCurrent ? 'Currently viewing (click to refresh)' : 'Click to switch to this tab'));
  clickableDiv.draggable = false; // Prevent drag interference
  clickableDiv.appendChild(checkbox);
  clickableDiv.appendChild(titleSpan);
  clickableDiv.addEventListener('click', (e) => {
    if (e.target !== checkbox) {
      switchTab(tabId);
    }
  });

  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.className = 'button-small';
  closeBtn.draggable = false; // Prevent drag interference
  closeBtn.addEventListener('click', (e) => {
    console.log('Close button clicked for tab:', tabId);
    e.stopPropagation();
    e.preventDefault();
    closeTab(tabId);
  });

  tabEl.appendChild(clickableDiv);
  tabEl.appendChild(closeBtn);

  // Add drag and drop event listeners
  tabEl.addEventListener('dragstart', handleDragStart);
  tabEl.addEventListener('dragend', handleDragEnd);
  tabEl.addEventListener('dragover', handleDragOver);
  tabEl.addEventListener('drop', handleDrop);
  tabEl.addEventListener('dragleave', handleDragLeave);

  tabList.appendChild(tabEl);
}

/**
 * Render recently closed tabs button
 */
function renderRecentlyClosedButton() {
  const btn = document.createElement('button');
  btn.className = 'recently-closed-btn';
  btn.textContent = `🕐 Recently Closed (${state.closedTabs.length})`;
  btn.addEventListener('click', showRecentlyClosedMenu);
  tabList.appendChild(btn);
}

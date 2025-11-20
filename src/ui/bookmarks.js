/**
 * Bookmark management
 * Handles bookmark creation, deletion, rendering, and searching
 */

/**
 * Add or remove bookmark for current tab
 */
function toggleBookmark() {
  if (!state.activeTabId) {
    updateStatus('No active tab to bookmark', 'error');
    return;
  }

  const activeTab = state.activeTabs.get(state.activeTabId);
  if (!activeTab) {
    updateStatus('Could not find active tab', 'error');
    return;
  }

  const existingBookmark = bookmarkStorage.isBookmarked(activeTab.url);

  if (existingBookmark) {
    // Remove bookmark
    bookmarkStorage.remove(existingBookmark.id);
    updateStatus('Bookmark removed', 'success');
    addMessage(`🗑️ Removed bookmark: ${activeTab.title}`, 'system');
  } else {
    // Add bookmark
    const bookmark = bookmarkStorage.add(activeTab.url, activeTab.title);
    updateStatus('Bookmark added', 'success');
    addMessage(`⭐ Bookmarked: ${activeTab.title}`, 'system');
  }

  renderBookmarks();
  updateBookmarkButton();
}

/**
 * Update bookmark button state based on current tab
 */
function updateBookmarkButton() {
  if (!state.activeTabId) {
    bookmarkBtn.classList.remove('bookmarked');
    bookmarkBtn.title = 'No active tab';
    return;
  }

  const activeTab = state.activeTabs.get(state.activeTabId);
  if (!activeTab) {
    bookmarkBtn.classList.remove('bookmarked');
    bookmarkBtn.title = 'Bookmark current tab';
    return;
  }

  const isBookmarked = bookmarkStorage.isBookmarked(activeTab.url);
  if (isBookmarked) {
    bookmarkBtn.classList.add('bookmarked');
    bookmarkBtn.title = 'Remove bookmark';
  } else {
    bookmarkBtn.classList.remove('bookmarked');
    bookmarkBtn.title = 'Bookmark current tab';
  }
}

/**
 * Open a bookmarked URL
 */
async function openBookmark(url) {
  try {
    setLoading(true);
    updateStatus('Opening bookmark...');

    const result = await window.electronAPI.openTab(url);
    const initialTitle = result.title || 'Loading...';
    state.activeTabs.set(result.id, { url: result.url, title: initialTitle });

    if (result.isActive) {
      state.activeTabId = result.id;
    }

    addMessage(`✅ Opened bookmark: ${url}`, 'system');
    updateStatus('Bookmark opened successfully', 'success');
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
 * Remove a bookmark
 */
function removeBookmark(bookmarkId, event) {
  if (event) {
    event.stopPropagation(); // Prevent opening bookmark when deleting
  }

  const bookmarks = bookmarkStorage.load();
  const bookmark = bookmarks.find(b => b.id === bookmarkId);

  if (bookmark) {
    bookmarkStorage.remove(bookmarkId);
    addMessage(`🗑️ Removed bookmark: ${bookmark.title}`, 'system');
    updateStatus('Bookmark removed', 'success');
    renderBookmarks();
    updateBookmarkButton();
  }
}

/**
 * Render bookmarks list
 */
function renderBookmarks(searchQuery = '') {
  const bookmarks = searchQuery
    ? bookmarkStorage.search(searchQuery)
    : bookmarkStorage.load();

  bookmarkList.innerHTML = '';

  if (bookmarks.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'bookmark-empty';
    emptyEl.textContent = searchQuery
      ? 'No bookmarks found'
      : 'No bookmarks yet. Click the ★ button to bookmark the current tab.';
    bookmarkList.appendChild(emptyEl);
    return;
  }

  bookmarks.forEach(bookmark => {
    const bookmarkEl = document.createElement('div');
    bookmarkEl.className = 'bookmark-item';

    // Create info section
    const infoEl = document.createElement('div');
    infoEl.className = 'bookmark-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'bookmark-title';
    titleEl.textContent = bookmark.title;

    const urlEl = document.createElement('div');
    urlEl.className = 'bookmark-url';
    urlEl.textContent = bookmark.url;

    infoEl.appendChild(titleEl);
    infoEl.appendChild(urlEl);

    // Create actions section
    const actionsEl = document.createElement('div');
    actionsEl.className = 'bookmark-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'button-small';
    deleteBtn.style.background = '#e74c3c';
    deleteBtn.addEventListener('click', (e) => removeBookmark(bookmark.id, e));

    actionsEl.appendChild(deleteBtn);

    // Click on bookmark item to open
    bookmarkEl.addEventListener('click', (e) => {
      if (e.target === bookmarkEl || e.target === infoEl || e.target === titleEl || e.target === urlEl) {
        openBookmark(bookmark.url);
      }
    });

    bookmarkEl.appendChild(infoEl);
    bookmarkEl.appendChild(actionsEl);
    bookmarkList.appendChild(bookmarkEl);
  });
}

/**
 * Handle bookmark search
 */
function handleBookmarkSearch() {
  const query = bookmarkSearchInput.value.trim();
  renderBookmarks(query);
}

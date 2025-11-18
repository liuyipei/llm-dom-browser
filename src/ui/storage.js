/**
 * Storage management module
 * Handles all localStorage operations for settings, bookmarks, and tab management
 */

// Storage keys (will be initialized from config or directly)
const STORAGE_KEYS = {
  SETTINGS: 'llm-dom-browser-settings',
  BOOKMARKS: 'llm-dom-browser-bookmarks',
  TAB_MANAGEMENT: 'tab-management'
};

// Settings storage management
const storage = {
  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        apiKeys: {},
        selectedModels: {},
        fetchedModels: {},
        endpoints: {}
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      return { apiKeys: {}, selectedModels: {}, fetchedModels: {}, endpoints: {} };
    }
  },

  save(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
      console.log('Settings saved to localStorage:', data);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  getApiKey(provider) {
    const data = this.load();
    return data.apiKeys[provider] || '';
  },

  saveApiKey(provider, apiKey) {
    const data = this.load();
    data.apiKeys[provider] = apiKey;
    this.save(data);
    console.log(`Saved API key for provider: ${provider}`);
  },

  getSelectedModel(provider) {
    const data = this.load();
    return data.selectedModels[provider] || '';
  },

  saveSelectedModel(provider, model) {
    const data = this.load();
    data.selectedModels[provider] = model;
    this.save(data);
    console.log(`Saved selected model for ${provider}: ${model}`);
  },

  getFetchedModels(provider) {
    const data = this.load();
    return data.fetchedModels[provider] || null;
  },

  saveFetchedModels(provider, models) {
    const data = this.load();
    data.fetchedModels[provider] = models;
    this.save(data);
    console.log(`Saved fetched models for ${provider}:`, models);
  },

  getEndpoint(provider, defaultEndpoints = {}) {
    const data = this.load();
    return data.endpoints[provider] || defaultEndpoints[provider] || '';
  },

  saveEndpoint(provider, endpoint) {
    const data = this.load();
    data.endpoints[provider] = endpoint;
    this.save(data);
    console.log(`Saved endpoint for ${provider}: ${endpoint}`);
  }
};

// Tab Management Persistence
const tabPersistence = {
  load() {
    const data = localStorage.getItem(STORAGE_KEYS.TAB_MANAGEMENT);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return {
          pinnedTabs: new Set(parsed.pinnedTabs || []),
          tabGroups: new Map(parsed.tabGroups || []),
          closedTabs: parsed.closedTabs || []
        };
      } catch (e) {
        console.error('Error loading tab management data:', e);
      }
    }
    return { pinnedTabs: new Set(), tabGroups: new Map(), closedTabs: [] };
  },

  save(state) {
    const data = {
      pinnedTabs: Array.from(state.pinnedTabs),
      tabGroups: Array.from(state.tabGroups.entries()),
      closedTabs: state.closedTabs.slice(-20) // Keep only last 20
    };
    localStorage.setItem(STORAGE_KEYS.TAB_MANAGEMENT, JSON.stringify(data));
  }
};

// Bookmark storage management
const bookmarkStorage = {
  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      return [];
    }
  },

  save(bookmarks) {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
      console.log('Bookmarks saved:', bookmarks);
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  },

  add(url, title, tags = []) {
    const bookmarks = this.load();

    // Check if bookmark already exists
    const existingIndex = bookmarks.findIndex(b => b.url === url);
    if (existingIndex !== -1) {
      // Update existing bookmark
      bookmarks[existingIndex].title = title;
      bookmarks[existingIndex].tags = tags;
      bookmarks[existingIndex].lastUpdated = new Date().toISOString();
      this.save(bookmarks);
      return bookmarks[existingIndex];
    }

    // Create new bookmark
    const bookmark = {
      id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      title: title || url,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    bookmarks.unshift(bookmark); // Add to beginning
    this.save(bookmarks);
    return bookmark;
  },

  remove(bookmarkId) {
    const bookmarks = this.load();
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    this.save(filtered);
    return filtered.length < bookmarks.length;
  },

  update(bookmarkId, updates) {
    const bookmarks = this.load();
    const index = bookmarks.findIndex(b => b.id === bookmarkId);

    if (index === -1) return null;

    // Update allowed fields
    ['title', 'tags', 'url'].forEach(field => {
      if (updates[field] !== undefined) {
        bookmarks[index][field] = updates[field];
      }
    });

    bookmarks[index].lastUpdated = new Date().toISOString();
    this.save(bookmarks);
    return bookmarks[index];
  },

  isBookmarked(url) {
    const bookmarks = this.load();
    return bookmarks.find(b => b.url === url) || null;
  },

  search(query) {
    const bookmarks = this.load();
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(b =>
      b.title.toLowerCase().includes(lowerQuery) ||
      b.url.toLowerCase().includes(lowerQuery) ||
      (b.tags && b.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }
};

// Export for browser usage
if (typeof window !== 'undefined') {
  window.AppStorage = {
    storage,
    tabPersistence,
    bookmarkStorage
  };
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    storage,
    tabPersistence,
    bookmarkStorage
  };
}

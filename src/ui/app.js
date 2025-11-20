// Main application JavaScript - orchestrates all modules

// UI State
const state = {
  activeTabs: new Map(),
  selectedTabs: new Set(),
  activeTabId: null, // Currently visible tab
  isLoading: false,
  currentProvider: null, // Track current provider for saving API key when switching
  tabOrder: [], // Array of tab IDs in display order
  closedTabs: [], // Array of recently closed tabs (max 20)
  draggedTabId: null, // Currently dragged tab
  sortMode: 'time', // Tab sort mode: 'manual', 'url', or 'time' (default: time)
  sortDirection: 'desc', // Sort direction: 'asc' or 'desc' (default: desc - most recent/Z-A first)
  tabLastViewTime: new Map(), // Track last view time for each tab
  conversationCounter: 0, // Strictly increasing counter for conversation IDs
  notesCounter: 0, // Strictly increasing counter for notes tab IDs
  pendingConversation: null // Temporarily stores user message until assistant responds
};

// DOM Elements
const mainContentWrapper = document.querySelector('.main-content-wrapper');
const chatContainer = document.getElementById('chatContainer');
const tabList = document.getElementById('tabList');
const urlInput = document.getElementById('urlInput');
const openBtn = document.getElementById('openBtn');
const uploadBtn = document.getElementById('uploadBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const providerSelect = document.getElementById('providerSelect');
const modelSelect = document.getElementById('modelSelect');
const modelSearchInput = document.getElementById('modelSearchInput');
const includeMediaCheckbox = document.getElementById('includeMediaCheckbox');
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const statusEl = document.getElementById('status');
const endpointRow = document.getElementById('endpointRow');
const endpointInput = document.getElementById('endpointInput');
const checkHealthBtn = document.getElementById('checkHealthBtn');
const healthStatus = document.getElementById('healthStatus');
const refreshModelsBtn = document.getElementById('refreshModelsBtn');
const ollamaManagement = document.getElementById('ollamaManagement');
const ollamaPullInput = document.getElementById('ollamaPullInput');
const ollamaPullBtn = document.getElementById('ollamaPullBtn');
const ollamaPullProgress = document.getElementById('ollamaPullProgress');
const menuButton = document.getElementById('menuButton');
const tabsSection = document.querySelector('.tabs-section');
const inputSection = document.querySelector('.input-section');
const bookmarksSection = document.querySelector('.bookmarks-section');
const bookmarksToggle = document.getElementById('bookmarksToggle');
const bookmarkList = document.getElementById('bookmarkList');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const bookmarkSearchInput = document.getElementById('bookmarkSearchInput');
const sortByUrlBtn = document.getElementById('sortByUrlBtn');
const sortByTimeBtn = document.getElementById('sortByTimeBtn');
const sortManualBtn = document.getElementById('sortManualBtn');
const createNotesBtn = document.getElementById('createNotesBtn');
const fireworksDeploymentRow = document.getElementById('fireworksDeploymentRow');
const fireworksDeploymentInput = document.getElementById('fireworksDeploymentInput');

// Provider models data
let providersData = null;

// Model search state
const modelSearchState = {
  allOptions: [], // Store all option elements for filtering
  allOptgroups: [] // Store all optgroup elements for filtering
};

/**
 * Initialize application
 */
async function initialize() {
  // Initialize menu state
  menuState.init();

  // Initialize bookmarks collapse state
  bookmarksState.init();

  // Load providers
  await loadProviders();

  // Restore last selected provider
  const lastProvider = storage.getLastSelectedProvider();
  if (lastProvider && providerSelect.querySelector(`option[value="${lastProvider}"]`)) {
    providerSelect.value = lastProvider;
    console.log(`Restored last selected provider: ${lastProvider}`);
  }

  // Initialize provider-specific UI (this will handle API keys, endpoints, models, etc.)
  const provider = providerSelect.value;
  state.currentProvider = provider;

  // Handle local providers
  const isLocal = window.AppConfig.LOCAL_PROVIDERS.includes(provider);
  if (isLocal) {
    // Show endpoint configuration
    endpointRow.style.display = 'flex';
    refreshModelsBtn.style.display = 'inline-block';

    // Load saved endpoint
    const savedEndpoint = storage.getEndpoint(provider);
    endpointInput.value = savedEndpoint;

    // Show Ollama management if Ollama is selected
    ollamaManagement.style.display = (provider === 'ollama') ? 'block' : 'none';

    // Make API key optional for local providers
    apiKeyInput.placeholder = 'API Key (optional for local providers)';
    apiKeyInput.value = storage.getApiKey(provider);

    // Check health and fetch models
    await checkProviderHealth();
    await refreshLocalModels();
  } else {
    // Hide local provider UI
    endpointRow.style.display = 'none';
    refreshModelsBtn.style.display = 'none';
    ollamaManagement.style.display = 'none';
    apiKeyInput.placeholder = 'API Key...';

    // Restore API key for cloud provider
    const savedApiKey = storage.getApiKey(provider);
    if (savedApiKey) {
      apiKeyInput.value = savedApiKey;
      console.log(`Restored API key on init for provider: ${provider}`);
    }
  }

  // Show Fireworks deployment field if Fireworks is selected
  if (provider === 'fireworks') {
    fireworksDeploymentRow.style.display = 'flex';
    const savedDeployment = storage.getFireworksDeployment();
    if (savedDeployment) {
      fireworksDeploymentInput.value = savedDeployment;
      console.log(`Restored Fireworks deployment ID: ${savedDeployment}`);
    }
  } else {
    fireworksDeploymentRow.style.display = 'none';
  }

  // Load persisted tab management data
  const tabData = tabPersistence.load();
  state.closedTabs = tabData.closedTabs;
  console.log('Loaded tab management data:', {
    closedTabs: state.closedTabs.length
  });

  // The model will be restored automatically when updateModelSelect is called above

  // Initialize bookmarks
  renderBookmarks();
  updateBookmarkButton();

  updateStatus('Ready', 'success');
  addMessage('👋 Welcome! Open a URL or upload a file to get started.', 'system');
  addMessage('💡 Tip: Press F12 to open DevTools for the UI, Ctrl+Shift+C for the active tab', 'system');
}

// Start the application
initialize();

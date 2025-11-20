// Application state and DOM element references
// This file must load FIRST before any other modules that reference these variables

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

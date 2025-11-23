# Svelte Migration Design Document

## Executive Summary

This document outlines an iterative migration strategy for llm-dom-browser from vanilla JavaScript to Svelte, targeting a **60-70% code reduction** in the UI layer while improving maintainability and developer experience.

**Current State:** 2,561-line monolithic HTML file with manual DOM manipulation and state synchronization
**Target State:** Component-based architecture with reactive state management and declarative rendering
**Approach:** Iterative migration with zero downtime

---

## Current Architecture Analysis

### Pain Points

1. **Manual DOM Manipulation** - 188+ instances of `createElement`, `innerHTML` manipulation
2. **No Reactivity** - Explicit `renderTabs()`, `renderBookmarks()` calls after every state change
3. **State Fragmentation** - Multiple state objects (`state`, `menuState`, `bookmarksState`, `modelSearchState`)
4. **Event Listener Hell** - Manual attachment, no automatic cleanup, potential memory leaks
5. **Monolithic UI** - Single 2,561-line HTML file with embedded JavaScript
6. **No Component Abstraction** - Repeated patterns for tabs, bookmarks, messages
7. **Build System Gaps** - No bundler, no hot reload, no module system

### Key Metrics

| Metric | Current | Target |
|--------|---------|--------|
| `chat.html` LOC | 2,561 | ~800-1,000 (split into components) |
| Manual DOM calls | 188+ | ~0 |
| State synchronization | Manual | Automatic (reactive) |
| Component reusability | Low | High |
| Type safety | None | Optional (TypeScript) |

---

## Migration Strategy

### Guiding Principles

1. **Iterative Migration** - Component-by-component, not big bang
2. **Zero Downtime** - App remains functional throughout
3. **Hybrid Coexistence** - Svelte and vanilla JS work together during transition
4. **Progressive Enhancement** - Start with high-impact, low-risk components
5. **Test Coverage** - Maintain/expand tests during migration

### Migration Phases

#### Phase 1: Foundation (Week 1-2)
**Goal:** Set up Svelte build pipeline and migrate first isolated component

**Tasks:**
- Install Svelte, Vite, and dependencies
- Configure Vite for Electron renderer process
- Set up Svelte component structure
- Create bridge between Svelte and vanilla JS
- Migrate **BookmarkList** component (isolated, well-defined)

**Success Criteria:**
- Bookmarks rendered by Svelte component
- IPC events still work
- No regressions in bookmark functionality

#### Phase 2: Core Components (Week 3-5)
**Goal:** Migrate high-impact UI components

**Migration Order:**
1. **TabList** component - Most complex, highest value
2. **ProviderSelector** component - Complex conditional logic
3. **ModelSelector** component - Dynamic dropdowns, search
4. **ChatMessage** component - Markdown rendering, code highlighting
5. **SettingsPanel** component - Form handling

**Success Criteria:**
- All core features working via Svelte
- Performance equal or better than vanilla
- Code reduced by 50%+

#### Phase 3: State Management (Week 6-7)
**Goal:** Consolidate fragmented state into Svelte stores

**Tasks:**
- Create Svelte stores for:
  - `tabStore` - Active tabs, selection, order, drag state
  - `uiStore` - Menu state, bookmarks state, modal state
  - `configStore` - Provider, model, API keys (with localStorage sync)
- Migrate from global `state` object to stores
- Implement reactive persistence

**Success Criteria:**
- Single source of truth for all state
- Automatic UI updates on state changes
- LocalStorage sync via store subscriptions

#### Phase 4: Polish & Optimization (Week 8)
**Goal:** Complete migration and optimize

**Tasks:**
- Migrate remaining UI elements (modals, overlays)
- Remove all vanilla DOM manipulation code
- Performance optimization (virtual scrolling for large lists)
- Add TypeScript definitions (optional)
- Update tests for Svelte components

**Success Criteria:**
- Zero vanilla DOM code in UI
- All tests passing
- Performance benchmarks met or exceeded

---

## Target Architecture

### Component Hierarchy

```
App.svelte (root)
├── Header.svelte
│   ├── MenuToggle.svelte
│   └── Logo.svelte
├── ChatContainer.svelte
│   └── ChatMessage.svelte (foreach message)
│       ├── MarkdownContent.svelte
│       └── CodeBlock.svelte
├── InputControls.svelte
│   ├── QueryInput.svelte
│   ├── UrlInput.svelte
│   └── FileUpload.svelte
├── TabsSection.svelte
│   ├── TabControls.svelte
│   │   ├── SortButtons.svelte
│   │   └── TabCounter.svelte
│   └── TabList.svelte
│       └── TabItem.svelte (foreach tab)
├── BookmarksSection.svelte
│   ├── BookmarkSearch.svelte
│   └── BookmarkList.svelte
│       └── BookmarkItem.svelte (foreach bookmark)
├── SettingsPanel.svelte
│   ├── ProviderSelector.svelte
│   ├── ModelSelector.svelte
│   └── ApiKeyInput.svelte
└── Modals.svelte
    ├── RecentlyClosedModal.svelte
    └── ProgressModal.svelte
```

### State Management

**Svelte Stores** (replaces global state objects):

```javascript
// stores/tabs.js
export const activeTabs = writable(new Map());
export const selectedTabs = writable(new Set());
export const activeTabId = writable(null);
export const tabOrder = writable([]);
export const sortMode = writable('time');
export const sortDirection = writable('desc');

// Derived stores
export const sortedTabs = derived(
  [activeTabs, tabOrder, sortMode, sortDirection],
  ([$activeTabs, $tabOrder, $sortMode, $sortDirection]) => {
    // Sorting logic here - auto-updates when dependencies change
  }
);
```

```javascript
// stores/config.js (with localStorage persistence)
function createPersistedStore(key, initial) {
  const stored = localStorage.getItem(key);
  const store = writable(stored ? JSON.parse(stored) : initial);

  store.subscribe(value => {
    localStorage.setItem(key, JSON.stringify(value));
  });

  return store;
}

export const provider = createPersistedStore('provider', 'openai');
export const model = createPersistedStore('model', null);
export const apiKeys = createPersistedStore('apiKeys', {});
```

### Svelte-Electron IPC Bridge

**Pattern for handling Electron IPC in Svelte:**

```javascript
// ipc-bridge.js
import { activeTabs, activeTabId } from './stores/tabs';

export function initializeIPCListeners() {
  window.electronAPI.onTabTitleUpdated((tabId, title) => {
    activeTabs.update(tabs => {
      const tab = tabs.get(tabId);
      if (tab) tab.title = title;
      return tabs;
    });
  });

  window.electronAPI.onActiveTabChanged((tabId) => {
    activeTabId.set(tabId);
  });

  // ... more listeners
}
```

---

## Code Comparison Examples

### Example 1: Tab Rendering

**Before (Vanilla JS - 88 lines):**
```javascript
function renderTabElement(tabId) {
  const tab = state.activeTabs.get(tabId);
  const tabEl = document.createElement('div');
  tabEl.className = 'tab-item';

  if (tabId === state.activeTabId) {
    tabEl.classList.add('active');
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = state.selectedTabs.has(tabId);
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      state.selectedTabs.add(tabId);
    } else {
      state.selectedTabs.delete(tabId);
    }
    renderTabs();
  });

  const titleSpan = document.createElement('span');
  titleSpan.textContent = tab.title;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => closeTab(tabId));

  tabEl.appendChild(checkbox);
  tabEl.appendChild(titleSpan);
  tabEl.appendChild(closeBtn);

  // ... 60 more lines

  tabList.appendChild(tabEl);
}
```

**After (Svelte - 25 lines):**
```svelte
<!-- TabItem.svelte -->
<script>
  import { selectedTabs, activeTabId } from '../stores/tabs';

  export let tab;

  $: isSelected = $selectedTabs.has(tab.id);
  $: isActive = tab.id === $activeTabId;

  function toggleSelection() {
    selectedTabs.update(set => {
      if (set.has(tab.id)) set.delete(tab.id);
      else set.add(tab.id);
      return set;
    });
  }
</script>

<div class="tab-item" class:active={isActive} draggable="true">
  <input type="checkbox" checked={isSelected} on:change={toggleSelection} />
  <span class="tab-title">{tab.title}</span>
  <button class="close-btn" on:click={() => closeTab(tab.id)}>×</button>
</div>

<style>
  .tab-item { /* scoped styles */ }
  .tab-item.active { /* scoped styles */ }
</style>
```

**Savings:** 72% reduction (88 → 25 lines), automatic reactivity, scoped styles

### Example 2: List Rendering

**Before (Vanilla JS):**
```javascript
function renderTabs() {
  tabList.innerHTML = ''; // Nuclear re-render

  const displayOrder = getSortedTabOrder();
  displayOrder.forEach(tabId => {
    if (state.activeTabs.has(tabId)) {
      renderTabElement(tabId); // Rebuild everything
    }
  });
}

// Must call manually after any state change
state.activeTabs.set(id, newTab);
renderTabs(); // Easy to forget!
```

**After (Svelte):**
```svelte
<!-- TabList.svelte -->
<script>
  import { sortedTabs } from '../stores/tabs';
  import TabItem from './TabItem.svelte';
</script>

{#each $sortedTabs as tab (tab.id)}
  <TabItem {tab} />
{/each}
```

**Benefits:** Automatic updates, keyed rendering (efficient diffs), no manual re-render calls

### Example 3: Conditional UI

**Before (Vanilla JS):**
```javascript
function updateSortButtons() {
  sortByTimeBtn.classList.remove('active');
  sortByUrlBtn.classList.remove('active');
  sortByTitleBtn.classList.remove('active');

  if (state.sortMode === 'time') {
    sortByTimeBtn.classList.add('active');
  } else if (state.sortMode === 'url') {
    sortByUrlBtn.classList.add('active');
  } else if (state.sortMode === 'title') {
    sortByTitleBtn.classList.add('active');
  }
}

// Must call after sortMode changes
state.sortMode = 'url';
updateSortButtons();
```

**After (Svelte):**
```svelte
<script>
  import { sortMode } from '../stores/tabs';
</script>

<button class:active={$sortMode === 'time'} on:click={() => $sortMode = 'time'}>
  Time
</button>
<button class:active={$sortMode === 'url'} on:click={() => $sortMode = 'url'}>
  URL
</button>
<button class:active={$sortMode === 'title'} on:click={() => $sortMode = 'title'}>
  Title
</button>
```

**Benefits:** Declarative, automatic updates, no manual class manipulation

### Example 4: Form Handling

**Before (Vanilla JS):**
```javascript
const apiKeyInput = document.querySelector('#api-key-input');
apiKeyInput.addEventListener('input', (e) => {
  const value = e.target.value;
  // Debounce logic here
  saveApiKey(state.currentProvider, value);
});

function loadApiKey(provider) {
  const key = localStorage.getItem(`apiKey_${provider}`);
  apiKeyInput.value = key || '';
}

// Must call when provider changes
state.currentProvider = 'openai';
loadApiKey('openai');
```

**After (Svelte):**
```svelte
<script>
  import { provider, apiKeys } from '../stores/config';

  let apiKeyInput = '';

  $: apiKeyInput = $apiKeys[$provider] || '';
  $: $apiKeys[$provider] = apiKeyInput; // Auto-saves via store subscription
</script>

<input type="password" bind:value={apiKeyInput} placeholder="API Key" />
```

**Benefits:** Two-way binding, automatic persistence, no manual sync

---

## Build System Updates

### New Dependencies

```json
{
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte": "^5.0.0",
    "vite": "^6.0.0",
    "vite-plugin-electron": "^0.28.0"
  }
}
```

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    svelte(),
    electron({
      entry: 'main.js',
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'src/ui/main.html', // Renamed from chat.html
      },
    },
  },
  resolve: {
    alias: {
      '$lib': '/src/lib',
      '$stores': '/src/stores',
      '$components': '/src/ui/components',
    },
  },
});
```

### New Project Structure

```
llm-dom-browser/
├── src/
│   ├── main/                   # Electron main process (unchanged)
│   │   ├── main.js
│   │   ├── tab-manager.js
│   │   └── ipc-handlers.js
│   ├── services/               # Services (unchanged)
│   ├── providers/              # LLM providers (unchanged)
│   └── ui/                     # UI layer (migrated to Svelte)
│       ├── App.svelte          # Root component
│       ├── main.html           # Entry point (loads App.svelte)
│       ├── components/
│       │   ├── tabs/
│       │   │   ├── TabList.svelte
│       │   │   ├── TabItem.svelte
│       │   │   └── TabControls.svelte
│       │   ├── bookmarks/
│       │   │   ├── BookmarkList.svelte
│       │   │   └── BookmarkItem.svelte
│       │   ├── chat/
│       │   │   ├── ChatContainer.svelte
│       │   │   └── ChatMessage.svelte
│       │   └── settings/
│       │       ├── ProviderSelector.svelte
│       │       └── ModelSelector.svelte
│       ├── stores/
│       │   ├── tabs.js         # Tab state
│       │   ├── config.js       # Configuration
│       │   └── ui.js           # UI state
│       └── lib/
│           ├── ipc-bridge.js   # Electron IPC integration
│           └── utils.js
├── vite.config.js
└── package.json
```

---

## Key Insights & Best Practices

### 1. Incremental Migration Strategy

**Insight:** Don't rewrite everything at once. Use Svelte's ability to work with existing DOM.

**Approach:**
- Start with leaf components (no dependencies)
- Mount Svelte components into existing DOM containers
- Gradually replace parent components
- Keep Electron IPC layer unchanged initially

**Example hybrid setup:**
```javascript
// chat.html (transitional)
import App from './App.svelte';

// Mount Svelte app into existing container
const app = new App({
  target: document.getElementById('app-root'),
  props: {
    // Pass existing state if needed
    initialTabs: Array.from(state.activeTabs.values()),
  },
});
```

### 2. Store-Based Architecture

**Insight:** Svelte stores are the perfect replacement for the fragmented state objects.

**Pattern:**
```javascript
// Writable stores for local state
export const isLoading = writable(false);

// Derived stores for computed values (auto-update)
export const visibleTabs = derived(
  [activeTabs, searchQuery],
  ([$tabs, $query]) => $tabs.filter(t => t.title.includes($query))
);

// Custom stores for complex logic
function createTabStore() {
  const { subscribe, update, set } = writable(new Map());

  return {
    subscribe,
    add: (tab) => update(tabs => tabs.set(tab.id, tab)),
    remove: (id) => update(tabs => { tabs.delete(id); return tabs; }),
    setActive: (id) => /* custom logic */,
  };
}
```

### 3. Reactive Statements Replace Manual Updates

**Insight:** Use `$:` to automatically run code when dependencies change.

**Before:**
```javascript
function updateTabDisplay() {
  const sorted = getSortedTabs();
  renderTabs(sorted);
  updateTabCounter(sorted.length);
}

// Must call manually
state.sortMode = 'url';
updateTabDisplay();
```

**After:**
```svelte
<script>
  $: sortedTabs = getSortedTabs($activeTabs, $sortMode);
  $: tabCount = sortedTabs.length;
  // Automatically re-runs when activeTabs or sortMode changes
</script>
```

### 4. Component Events Replace Callbacks

**Insight:** Svelte's event system is cleaner than manual callback props.

```svelte
<!-- TabItem.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let tab;
</script>

<button on:click={() => dispatch('close', { id: tab.id })}>×</button>

<!-- TabList.svelte -->
<TabItem {tab} on:close={handleTabClose} />
```

### 5. Svelte Actions for DOM Interop

**Insight:** Use Svelte actions for complex DOM interactions (drag-drop, tooltips).

```javascript
// lib/drag-and-drop.js
export function draggable(node, data) {
  function handleDragStart(event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', data.id);
  }

  node.addEventListener('dragstart', handleDragStart);

  return {
    destroy() {
      node.removeEventListener('dragstart', handleDragStart);
    }
  };
}
```

```svelte
<script>
  import { draggable } from '$lib/drag-and-drop';
</script>

<div use:draggable={{ id: tab.id }}>
  {tab.title}
</div>
```

### 6. Keep Electron Layer Clean

**Insight:** Don't mix Svelte and Electron concerns. Use a clean bridge.

**Pattern:**
```javascript
// ipc-bridge.js - Single place for IPC integration
import * as tabStore from './stores/tabs';
import * as configStore from './stores/config';

export function initializeIPC() {
  // Electron → Svelte (via stores)
  window.electronAPI.onTabTitleUpdated((id, title) => {
    tabStore.updateTitle(id, title);
  });

  // Svelte → Electron (expose methods)
  return {
    openUrl: (url) => window.electronAPI.openUrl(url),
    closeTab: (id) => window.electronAPI.closeTab(id),
    // ...
  };
}
```

```svelte
<!-- In components -->
<script>
  import { getContext } from 'svelte';
  const ipc = getContext('ipc');
</script>

<button on:click={() => ipc.openUrl(url)}>Open</button>
```

### 7. Progressive Enhancement with TypeScript

**Insight:** TypeScript is optional but valuable. Add gradually.

```typescript
// stores/tabs.ts
import { writable, type Writable } from 'svelte/store';

export interface Tab {
  id: string;
  title: string;
  url: string;
  type: 'conversation' | 'notes' | 'webpage';
  isLoading: boolean;
}

export const activeTabs: Writable<Map<string, Tab>> = writable(new Map());
```

### 8. Testing Strategy

**Insight:** Svelte Testing Library makes component tests easier than vanilla DOM testing.

```javascript
// TabItem.test.js
import { render, fireEvent } from '@testing-library/svelte';
import TabItem from './TabItem.svelte';

test('closes tab when close button clicked', async () => {
  const { getByRole } = render(TabItem, {
    props: { tab: { id: '1', title: 'Test' } }
  });

  const closeBtn = getByRole('button', { name: '×' });
  await fireEvent.click(closeBtn);

  // Assert close event dispatched
});
```

### 9. Performance Considerations

**Optimization opportunities:**
- **Virtual scrolling** for large tab/bookmark lists (use `svelte-virtual-list`)
- **Lazy loading** for heavy components (use `{#await import()}`)
- **Keyed each blocks** for efficient list updates
- **Component-level code splitting** via dynamic imports

```svelte
{#each tabs as tab (tab.id)}
  <!-- Keyed by tab.id for efficient updates -->
  <TabItem {tab} />
{/each}
```

### 10. Migration Gotchas

**Watch out for:**

1. **Store subscriptions in components** - Auto-unsubscribe with `$` prefix
   ```svelte
   <!-- ❌ Manual subscription (memory leak) -->
   <script>
     let tabs;
     activeTabs.subscribe(value => tabs = value);
   </script>

   <!-- ✅ Auto-unsubscribe -->
   <script>
     import { activeTabs } from '$stores/tabs';
   </script>
   <div>{$activeTabs.size} tabs</div>
   ```

2. **IPC timing** - Ensure Svelte mounts before IPC listeners attach
3. **LocalStorage sync** - Use store subscriptions, not reactive statements
4. **CSS specificity** - Global styles may conflict with scoped component styles
5. **Event propagation** - Use `on:click|stopPropagation` when needed

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Total UI code reduction | 60-70% |
| Manual DOM manipulation calls | 0 |
| Component reusability | 80%+ components used in multiple places |
| Time to add new feature | 50% faster |
| Bundle size | < 500KB (Svelte + app code) |
| First render time | < 100ms |
| Test coverage | Maintain or exceed current coverage |

---

## Migration Checklist

### Phase 1: Foundation
- [ ] Install Svelte, Vite, dependencies
- [ ] Configure Vite for Electron renderer
- [ ] Set up component directory structure
- [ ] Create first Svelte component (BookmarkList)
- [ ] Verify IPC still works
- [ ] Update dev scripts for hot reload

### Phase 2: Core Components
- [ ] Migrate TabList + TabItem
- [ ] Migrate ProviderSelector
- [ ] Migrate ModelSelector
- [ ] Migrate ChatMessage
- [ ] Migrate SettingsPanel
- [ ] Test all features work

### Phase 3: State Management
- [ ] Create tab store
- [ ] Create config store (with persistence)
- [ ] Create UI store
- [ ] Replace global state object
- [ ] Verify localStorage sync
- [ ] Test state reactivity

### Phase 4: Polish
- [ ] Migrate remaining UI elements
- [ ] Remove all vanilla DOM code from chat.html
- [ ] Delete unused utility functions
- [ ] Performance optimization
- [ ] Update all tests
- [ ] Documentation updates

---

## Conclusion

Migrating to Svelte will dramatically simplify the llm-dom-browser UI codebase while improving maintainability and developer experience. The iterative approach ensures minimal risk and allows for continuous validation of functionality.

**Key Takeaways:**
1. Start small with isolated components
2. Use stores for all state management
3. Leverage Svelte's reactivity to eliminate manual DOM updates
4. Keep Electron layer clean with IPC bridge pattern
5. Test continuously throughout migration

**Expected Outcome:**
- 60-70% reduction in UI code
- Zero manual DOM manipulation
- Automatic reactivity and state synchronization
- Better developer experience with hot reload
- Foundation for future features and improvements

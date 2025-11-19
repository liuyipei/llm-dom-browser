# Svelte Migration Guide - Quick Reference

**TL;DR:** This guide contains the essential patterns and insights for migrating llm-dom-browser to Svelte. Read this first, refer to the full design doc for details.

---

## Migration in 3 Steps

1. **Set up build system** (Vite + Svelte)
2. **Migrate components one at a time** (start with BookmarkList)
3. **Consolidate state into stores** (replace global state object)

---

## Essential Patterns

### 1. Vanilla JS → Svelte Component Template

**Before (88 lines of DOM manipulation):**
```javascript
function renderTabElement(tabId) {
  const tab = state.activeTabs.get(tabId);
  const tabEl = document.createElement('div');
  tabEl.className = 'tab-item';
  if (tabId === state.activeTabId) tabEl.classList.add('active');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = state.selectedTabs.has(tabId);
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) state.selectedTabs.add(tabId);
    else state.selectedTabs.delete(tabId);
    renderTabs(); // Manual re-render
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => closeTab(tabId));

  tabEl.append(checkbox, titleSpan, closeBtn);
  tabList.appendChild(tabEl);
}
```

**After (25 lines, automatic updates):**
```svelte
<!-- TabItem.svelte -->
<script>
  import { selectedTabs, activeTabId } from '$stores/tabs';

  export let tab;

  $: isActive = tab.id === $activeTabId;

  function toggleSelection() {
    selectedTabs.update(set => {
      if (set.has(tab.id)) set.delete(tab.id);
      else set.add(tab.id);
      return set;
    });
    // No manual re-render needed!
  }
</script>

<div class="tab-item" class:active={isActive}>
  <input type="checkbox" checked={$selectedTabs.has(tab.id)} on:change={toggleSelection} />
  <span>{tab.title}</span>
  <button on:click={() => closeTab(tab.id)}>×</button>
</div>

<style>
  .tab-item { /* scoped, won't leak */ }
</style>
```

**Key differences:**
- ❌ Manual `createElement`, `addEventListener`, `classList` → ✅ Declarative markup
- ❌ Manual `renderTabs()` calls → ✅ Automatic reactivity
- ❌ Global CSS → ✅ Scoped component styles

---

### 2. Global State → Svelte Stores

**Before (fragmented state):**
```javascript
// Scattered across codebase
const state = {
  activeTabs: new Map(),
  selectedTabs: new Set(),
  activeTabId: null,
  sortMode: 'time',
  // ...
};

const menuState = { collapsed: false };
const bookmarksState = { collapsed: false };
const modelSearchState = { query: '' };

// Manual localStorage sync
function saveState() {
  localStorage.setItem('tabs', JSON.stringify(Array.from(state.activeTabs)));
}

// Must call after every change
state.sortMode = 'url';
renderTabs(); // Easy to forget!
saveState();  // Easy to forget!
```

**After (consolidated stores):**
```javascript
// stores/tabs.js
import { writable, derived } from 'svelte/store';

export const activeTabs = writable(new Map());
export const selectedTabs = writable(new Set());
export const activeTabId = writable(null);
export const sortMode = writable('time');

// Derived stores auto-update when dependencies change
export const sortedTabs = derived(
  [activeTabs, sortMode],
  ([$tabs, $mode]) => sortTabs([...$tabs.values()], $mode)
);

// stores/config.js - Auto-persisted to localStorage
function createPersistedStore(key, initial) {
  const stored = localStorage.getItem(key);
  const store = writable(stored ? JSON.parse(stored) : initial);

  store.subscribe(value => {
    localStorage.setItem(key, JSON.stringify(value));
  });

  return store;
}

export const provider = createPersistedStore('provider', 'openai');
export const apiKeys = createPersistedStore('apiKeys', {});
```

**Usage in components:**
```svelte
<script>
  import { sortMode, sortedTabs } from '$stores/tabs';

  // $ prefix auto-subscribes and unsubscribes
  // $sortedTabs automatically updates when activeTabs or sortMode changes
</script>

<button class:active={$sortMode === 'url'} on:click={() => $sortMode = 'url'}>
  Sort by URL
</button>

{#each $sortedTabs as tab (tab.id)}
  <TabItem {tab} />
{/each}
```

**Key differences:**
- ❌ Manual state sync → ✅ Automatic reactivity
- ❌ Manual localStorage → ✅ Automatic persistence
- ❌ Manual re-renders → ✅ Auto-updates on state change
- ❌ Multiple state objects → ✅ Single source of truth

---

### 3. Event Listeners → Declarative Bindings

**Before (manual wiring):**
```javascript
const apiKeyInput = document.querySelector('#api-key');
const providerSelect = document.querySelector('#provider');

providerSelect.addEventListener('change', (e) => {
  state.currentProvider = e.target.value;
  loadApiKey(state.currentProvider);
});

apiKeyInput.addEventListener('input', (e) => {
  saveApiKey(state.currentProvider, e.target.value);
});

function loadApiKey(provider) {
  const key = localStorage.getItem(`apiKey_${provider}`);
  apiKeyInput.value = key || '';
}

// Memory leak potential - no cleanup
```

**After (automatic binding):**
```svelte
<script>
  import { provider, apiKeys } from '$stores/config';

  // Two-way binding
  $: currentApiKey = $apiKeys[$provider] || '';

  // Auto-saves via store subscription (no manual saveApiKey call)
  function updateApiKey(value) {
    apiKeys.update(keys => ({ ...keys, [$provider]: value }));
  }
</script>

<select bind:value={$provider}>
  <option value="openai">OpenAI</option>
  <option value="anthropic">Anthropic</option>
</select>

<input
  type="password"
  value={currentApiKey}
  on:input={(e) => updateApiKey(e.target.value)}
  placeholder="API Key"
/>
```

**Key differences:**
- ❌ Manual `addEventListener` → ✅ `on:event`
- ❌ Manual `removeEventListener` → ✅ Auto-cleanup
- ❌ Manual value sync → ✅ `bind:value`
- ❌ Memory leaks → ✅ Automatic cleanup

---

### 4. Conditional Rendering

**Before:**
```javascript
function updateVisibility() {
  if (state.isLoading) {
    loadingSpinner.style.display = 'block';
    submitButton.style.display = 'none';
  } else {
    loadingSpinner.style.display = 'none';
    submitButton.style.display = 'block';
  }
}

// Must call manually
state.isLoading = true;
updateVisibility();
```

**After:**
```svelte
<script>
  import { isLoading } from '$stores/ui';
</script>

{#if $isLoading}
  <div class="spinner">Loading...</div>
{:else}
  <button>Submit</button>
{/if}
```

---

### 5. List Rendering

**Before (inefficient full re-render):**
```javascript
function renderTabs() {
  tabList.innerHTML = ''; // Destroy everything

  state.tabOrder.forEach(tabId => {
    if (state.activeTabs.has(tabId)) {
      renderTabElement(tabId); // Rebuild from scratch
    }
  });
}
```

**After (efficient keyed updates):**
```svelte
<script>
  import { sortedTabs } from '$stores/tabs';
  import TabItem from './TabItem.svelte';
</script>

{#each $sortedTabs as tab (tab.id)}
  <TabItem {tab} />
{/each}
```

**Benefits:**
- Only updates changed items (keyed by `tab.id`)
- No full re-render
- Smooth animations possible

---

### 6. Electron IPC Integration

**Pattern: Clean IPC Bridge**

```javascript
// lib/ipc-bridge.js
import { activeTabs, activeTabId } from '$stores/tabs';

export function initializeIPC() {
  // Electron → Svelte (update stores)
  window.electronAPI.onTabTitleUpdated((id, title) => {
    activeTabs.update(tabs => {
      const tab = tabs.get(id);
      if (tab) tab.title = title;
      return tabs;
    });
  });

  window.electronAPI.onActiveTabChanged((id) => {
    activeTabId.set(id);
  });

  // Svelte → Electron (expose clean API)
  return {
    openUrl: (url) => window.electronAPI.openUrl(url),
    closeTab: (id) => window.electronAPI.closeTab(id),
    sendQuery: (query) => window.electronAPI.sendQuery(query),
  };
}
```

```svelte
<!-- App.svelte -->
<script>
  import { setContext } from 'svelte';
  import { initializeIPC } from '$lib/ipc-bridge';

  const ipc = initializeIPC();
  setContext('ipc', ipc);
</script>

<!-- TabItem.svelte -->
<script>
  import { getContext } from 'svelte';
  const ipc = getContext('ipc');

  export let tab;
</script>

<button on:click={() => ipc.closeTab(tab.id)}>Close</button>
```

---

### 7. Reactive Statements (Magic `$:`)

**Replace manual update functions with automatic reactivity:**

```svelte
<script>
  import { activeTabs, sortMode } from '$stores/tabs';

  // Automatically re-runs when activeTabs or sortMode changes
  $: sortedTabs = getSortedTabs($activeTabs, $sortMode);
  $: tabCount = sortedTabs.length;
  $: hasSelectedTabs = $selectedTabs.size > 0;

  // Can even use blocks
  $: {
    console.log(`${tabCount} tabs in ${$sortMode} mode`);
    if (tabCount === 0) {
      // Do something
    }
  }

  // Works with if statements
  $: if ($activeTabId) {
    scrollToActiveTab($activeTabId);
  }
</script>

<p>Showing {tabCount} tabs</p>
```

**Rule of thumb:** If you have a function that calculates something based on state, make it a `$:` reactive statement instead.

---

### 8. Component Communication

**Parent → Child (Props):**
```svelte
<!-- Parent -->
<TabItem tab={myTab} isActive={true} />

<!-- Child -->
<script>
  export let tab;
  export let isActive = false; // Default value
</script>
```

**Child → Parent (Events):**
```svelte
<!-- Child -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<button on:click={() => dispatch('close', { id: tab.id })}>×</button>

<!-- Parent -->
<TabItem {tab} on:close={handleClose} />
```

**Global State (Stores):**
```svelte
<!-- Any component can access -->
<script>
  import { activeTabId } from '$stores/tabs';
</script>

<div>Active: {$activeTabId}</div>
```

---

## Most Important Insights

### 1. Start Small, Iterate Fast
- Begin with **BookmarkList** (isolated, no dependencies)
- Then **TabList** (high impact)
- Don't try to migrate everything at once

### 2. Stores Are Your Friend
- Replace ALL global state with Svelte stores
- Use `derived` stores for computed values
- Use custom stores for complex logic
- Persist to localStorage via store subscriptions

### 3. Reactivity Eliminates Boilerplate
```javascript
// ❌ Before: Manual updates
state.tabs.push(newTab);
renderTabs();
updateCounter();
saveToStorage();

// ✅ After: Automatic
$tabs = [...$tabs, newTab];
// Everything updates automatically
```

### 4. Avoid Common Pitfalls

**❌ Don't do this:**
```svelte
<script>
  import { activeTabs } from '$stores/tabs';

  let tabs;
  activeTabs.subscribe(value => tabs = value); // Memory leak!
</script>
```

**✅ Do this:**
```svelte
<script>
  import { activeTabs } from '$stores/tabs';
  // Use $ prefix - auto-unsubscribes
</script>

<div>{$activeTabs.size} tabs</div>
```

**❌ Don't mutate store values directly:**
```svelte
<script>
  import { activeTabs } from '$stores/tabs';

  function addTab(tab) {
    $activeTabs.set(tab.id, tab); // Won't trigger reactivity!
  }
</script>
```

**✅ Use update() or reassignment:**
```svelte
<script>
  function addTab(tab) {
    activeTabs.update(tabs => {
      tabs.set(tab.id, tab);
      return tabs; // Return new reference
    });
  }
</script>
```

### 5. Keep IPC Layer Separate
- Don't mix Electron and Svelte concerns
- Use IPC bridge pattern (see section 6)
- Initialize IPC listeners once in App.svelte
- Use context to share IPC API with child components

### 6. Leverage Svelte DevTools
- Install [Svelte DevTools](https://github.com/sveltejs/svelte-devtools)
- Inspect component hierarchy
- Monitor store values in real-time
- Debug reactivity issues

---

## Quick Setup Guide

### 1. Install Dependencies

```bash
npm install -D svelte @sveltejs/vite-plugin-svelte vite vite-plugin-electron
```

### 2. Create vite.config.js

```javascript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'src/ui/main.html',
    },
  },
  resolve: {
    alias: {
      '$stores': '/src/ui/stores',
      '$components': '/src/ui/components',
      '$lib': '/src/ui/lib',
    },
  },
});
```

### 3. Create First Component

```svelte
<!-- src/ui/components/BookmarkList.svelte -->
<script>
  import { onMount } from 'svelte';

  let bookmarks = [];

  onMount(async () => {
    bookmarks = await window.electronAPI.getBookmarks();
  });
</script>

<div class="bookmark-list">
  {#each bookmarks as bookmark (bookmark.id)}
    <div class="bookmark-item">
      <span>{bookmark.title}</span>
      <a href={bookmark.url}>{bookmark.url}</a>
    </div>
  {/each}
</div>

<style>
  .bookmark-list { /* scoped styles */ }
</style>
```

### 4. Mount in Existing HTML

```html
<!-- src/ui/main.html -->
<div id="bookmark-container"></div>

<script type="module">
  import BookmarkList from './components/BookmarkList.svelte';

  new BookmarkList({
    target: document.getElementById('bookmark-container'),
  });
</script>
```

### 5. Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## Migration Checklist

### Pre-Migration
- [ ] Back up current codebase
- [ ] Install Svelte + Vite
- [ ] Configure Vite for Electron
- [ ] Create directory structure (`components/`, `stores/`, `lib/`)
- [ ] Set up path aliases

### Phase 1: First Component
- [ ] Create `BookmarkList.svelte`
- [ ] Mount in existing HTML
- [ ] Verify functionality
- [ ] Ensure IPC still works

### Phase 2: Core Components
- [ ] `TabList.svelte` + `TabItem.svelte`
- [ ] `ProviderSelector.svelte`
- [ ] `ModelSelector.svelte`
- [ ] `ChatMessage.svelte`
- [ ] Replace vanilla JS with components

### Phase 3: State Migration
- [ ] Create `stores/tabs.js`
- [ ] Create `stores/config.js`
- [ ] Create `stores/ui.js`
- [ ] Replace global `state` object
- [ ] Set up localStorage persistence
- [ ] Test reactivity

### Phase 4: Cleanup
- [ ] Remove all manual DOM manipulation
- [ ] Delete unused render functions
- [ ] Update tests
- [ ] Performance check
- [ ] Documentation

---

## Quick Reference: Common Replacements

| Vanilla JS | Svelte Equivalent |
|------------|------------------|
| `createElement` | Markup in `<template>` |
| `addEventListener` | `on:event` |
| `removeEventListener` | Automatic cleanup |
| `innerHTML = ''` | `{#each}` block |
| `classList.add/remove` | `class:name={condition}` |
| `input.value = x` | `bind:value={x}` |
| `if (x) show(); else hide()` | `{#if x} ... {:else} ... {/if}` |
| `element.style.display` | `class:hidden={!visible}` |
| `setAttribute('data-x', y)` | `data-x={y}` |
| Global state object | Svelte stores |
| Manual re-render calls | Reactive `$:` statements |

---

## When You're Stuck

1. **Component not updating?** → Check if you're mutating a store value directly (use `update()` instead)
2. **Memory leak?** → Check if you're manually subscribing to stores (use `$` prefix)
3. **Event not firing?** → Check `on:event` syntax and ensure handler is defined
4. **IPC not working?** → Verify IPC bridge is initialized and context is set
5. **Styles leaking?** → Ensure styles are in `<style>` block of component (not global CSS)

---

## Resources

- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Svelte Docs](https://svelte.dev/docs)
- [Svelte Stores](https://svelte.dev/docs/svelte-store)
- [Electron + Vite](https://github.com/electron-vite/electron-vite-vue)
- [Full Design Doc](./svelte-migration-design.md)

---

**Remember:** The goal is not just to migrate to Svelte, but to simplify the codebase. If something feels complicated in Svelte, you're probably doing it wrong. Svelte's strength is making complex things simple.

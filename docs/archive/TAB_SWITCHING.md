# Tab Switching Feature

## Overview

This PR adds comprehensive tab switching functionality to LLM-DOM-Browser, allowing users to switch between multiple open tabs and clearly distinguish between viewing a tab vs. selecting it for LLM analysis.

## Problem Statement

The original implementation had several issues:

1. **No tab switching**: Users could open multiple tabs but couldn't switch between them to view different content
2. **Loading indicator stuck**: Page titles remained as "Loading..." even after pages fully loaded (especially noticeable with YouTube)
3. **UI confusion**: It was unclear how to interact with tabs - what does clicking do vs. checking the checkbox?
4. **DevTools errors**: Attempting to toggle DevTools via menu caused `Cannot read properties of undefined (reading 'toggleDevTools')` errors
5. **Poor accessibility**: Hover effects on selected tabs made white text unreadable

## Solution

### 1. Tab Switching Implementation

**User Experience:**
- Click on a tab's title area to **switch to it** (makes it visible on screen)
- Click the checkbox to **select/deselect** it for LLM queries
- Eye icon (👁) shows which tab is currently visible
- Orange border highlights the active tab

**Technical Implementation:**

#### Main Process (`src/main.js`)
- Added `activeTabId` tracking variable to monitor currently visible tab
- Implemented `switch-tab` IPC handler that:
  - Removes and re-adds the WebContentsView to bring it to front (workaround for lack of z-index API)
  - Updates `activeTabId` state
  - Notifies chat UI via `active-tab-changed` event
- Automatically switches to first remaining tab when active tab is closed

#### Preload Script (`src/preload/chat-preload.js`)
- Exposed `switchTab(tabId)` method to renderer
- Added `onActiveTabChanged(callback)` listener for UI updates

#### UI (`src/ui/chat.html`)
- Added `activeTabId` to state management
- Separate click handlers for:
  - Checkbox: Toggle LLM selection (with `e.stopPropagation()`)
  - Tab area: Switch to tab
- Visual indicators:
  - `.current` class for orange border on active tab
  - `.active` class for blue background on selected tabs
  - Combined `.current.active` for tabs that are both

### 2. Fixed Title Loading Issue

**Problem:** Title update events fired before the `open-tab` IPC handler returned, so the UI didn't have the tab in its map yet when events arrived.

**Solution:**
- Capture title after `loadURL()` completes in main process
- Return initial title in IPC response: `{ id, url, title, isActive }`
- UI uses the actual title instead of hardcoding "Loading..."

**Additional Debugging:**
- Added comprehensive load event logging:
  - `did-start-loading` - When page starts loading
  - `did-fail-load` - If page fails (with error details)
  - `dom-ready` - When DOM is ready
  - `did-finish-load` - When page fully loads
  - `page-title-updated` - When title changes dynamically

### 3. DevTools Support

**Problem:** `BaseWindow` doesn't have a `webContents` property like `BrowserWindow`, so the default menu's "Toggle Developer Tools" tried to call a method on `undefined`.

**Solution:**
- Disabled default application menu: `Menu.setApplicationMenu(null)`
- Implemented keyboard shortcuts via global shortcuts:
  - **F12** or **Ctrl+Shift+I**: Toggle DevTools for chat UI
  - **Ctrl+Shift+C**: Toggle DevTools for active content tab
- Properly cleanup shortcuts on app quit

### 4. Improved UI/UX

#### Help Text
- Added guidance: "Click tab to view, checkbox to select for LLM"
- Added tooltips on hover explaining each action
- Welcome message includes DevTools shortcuts

#### Fixed Hover Effects
- **Unselected tabs**: Light blue hover (#e8f4f8)
- **Selected tabs**: Darker blue hover (#2980b9) - keeps white text readable
- Before: Light hover background made white text on blue background hard to read

#### Event Handling
- Replaced inline `onclick` attributes with proper JavaScript event listeners
- Proper event propagation control (checkbox clicks don't trigger tab switch)
- Better separation of concerns

## Technical Details

### State Management

```javascript
const state = {
  activeTabs: new Map(),      // All open tabs: tabId → { url, title }
  selectedTabs: new Set(),    // Tabs selected for LLM queries
  activeTabId: null           // Currently visible tab
};
```

### Visual States

A tab can be in multiple states simultaneously:

| State | Visual Indicator | Meaning |
|-------|-----------------|---------|
| Active (viewing) | 👁 Eye icon, orange border | Currently visible on screen |
| Selected (LLM) | Checked checkbox, blue background | Included in LLM queries |
| Both | Eye icon + checkbox, blue background | Currently viewing AND will send to LLM |

### WebContentsView Limitations

Electron's `WebContentsView` doesn't have built-in z-index or `bringToFront()` methods. The workaround:

```javascript
// Remove and re-add to bring to front
mainWindow.contentView.removeChildView(view);
mainWindow.contentView.addChildView(view);
view.setBounds({ x: 400, y: 0, width: 1000, height: 900 });
```

## Files Changed

- `src/main.js`: Tab switching logic, DevTools shortcuts, title capture
- `src/preload/chat-preload.js`: Exposed `switchTab` and `onActiveTabChanged`
- `src/ui/chat.html`: UI updates, event handlers, visual indicators

## Testing

Manual testing performed:
- [x] Open multiple tabs (YouTube, arXiv, example.com)
- [x] Click tabs to switch between them
- [x] Verify eye icon shows correct active tab
- [x] Checkbox toggles LLM selection without switching tabs
- [x] Titles load immediately (no more "Loading..." stuck)
- [x] Close active tab switches to another tab automatically
- [x] DevTools open via keyboard shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+C)
- [x] Hover effects maintain text readability
- [x] Tooltips provide clear guidance

## Screenshots

### Before
- Tabs stayed "Loading..."
- No way to switch between tabs
- DevTools menu caused errors

### After
- Titles load immediately
- Click tab to view it (eye icon shows active tab)
- Checkbox selects for LLM queries
- DevTools work via keyboard shortcuts
- Clear visual feedback with tooltips

## Future Enhancements

Potential improvements for future PRs:
- Tab reordering (drag & drop)
- Tab history navigation (back/forward buttons)
- Tab keyboard shortcuts (Ctrl+Tab, Ctrl+Shift+Tab)
- Tab preview on hover
- Close all tabs / Close other tabs options
- Persist tab state across app restarts

## Commit History

1. **066e052**: Add tab switching functionality and improve page load debugging
2. **5a0472b**: Fix tab switching UI interaction and add debugging for title updates
3. **d4e3405**: Fix title update timing, add DevTools support, and improve UI clarity
4. **746d437**: Fix DevTools menu error and improve hover effect on selected tabs

## Related Issues

Addresses user feedback regarding:
- Need for tab switching capability
- YouTube and other sites showing "Loading..." indefinitely
- Confusion about how to interact with tabs
- DevTools toggle errors

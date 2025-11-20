# Tricky Bugs and Design Patterns

This document catalogs subtle bugs that have occurred in the codebase and the design patterns we've adopted to prevent them.

## 1. Provider Switching API Key Loss (2025-01)

### The Bug

**Symptom:** Fireworks (and other cloud provider) API keys would mysteriously disappear when switching between local providers (Ollama, vLLM, LM Studio) and cloud providers.

**Root Cause:** Duplicated provider switching logic with inconsistent behavior:
- Local providers would **unconditionally clear** the API key field (since they don't require API keys)
- Cloud providers would **only restore the API key IF one existed** in storage
- This asymmetry meant: switching to local → field cleared → switching back to cloud → field stayed empty if no saved key

### Why It Was Tricky

1. **Multiple local providers** - Having 3 local providers (Ollama, vLLM, LM Studio) created many opportunities to trigger the bug
2. **Duplicated logic** - Provider switching code existed in TWO places:
   - `app-init.js` - Initial provider setup on app load
   - `event-listeners.js` - Provider changes via dropdown
3. **Different code paths** - Each location had slightly different conditional logic for handling API keys
4. **Silent failure** - No error messages, just an empty field that looked intentional

### The Fix

**Design Pattern: Single Source of Truth**

Created `provider-ui.js` with centralized provider configuration:

```javascript
// BEFORE: Logic duplicated in app-init.js and event-listeners.js
if (isLocal) {
  // ~30 lines of local provider setup
} else {
  // ~20 lines of cloud provider setup
}

// AFTER: Single function called from both places
await initializeProviderUI(provider);  // app-init.js
await switchProvider(newProvider, previousProvider);  // event-listeners.js
```

**Key principles:**
1. **Unconditional loading** - ALWAYS set the API key field, even if empty
2. **Single function** - One centralized `loadProviderSettings()` function
3. **Wrapper functions** - Context-specific wrappers (`initializeProviderUI`, `switchProvider`) with appropriate defaults
4. **Clear responsibility** - All UI state changes for provider switching happen in ONE place

### Code Locations

- **Central module**: `src/ui/provider-ui.js`
- **Initialization**: `src/ui/app-init.js:29` calls `initializeProviderUI()`
- **Event handler**: `src/ui/event-listeners.js:36` calls `switchProvider()`
- **HTML loading**: `src/ui/chat.html:145` includes script

### How to Avoid This Pattern

**❌ WRONG: Duplicating provider setup logic**
```javascript
// In file A
if (isLocal) {
  endpointRow.style.display = 'flex';
  apiKeyInput.value = storage.getApiKey(provider);
  // ... 20 more lines
}

// In file B (different conditions, different order)
if (isLocal) {
  apiKeyInput.value = storage.getApiKey(provider); // Forgot to unconditionally set!
  endpointRow.style.display = 'flex';
  // ... slightly different logic
}
```

**✅ CORRECT: Centralized function**
```javascript
// In provider-ui.js (SINGLE SOURCE OF TRUTH)
async function loadProviderSettings(provider, options) {
  // ALL provider UI logic here
}

// In file A
await initializeProviderUI(provider);

// In file B
await switchProvider(newProvider, previousProvider);
```

### Testing This Scenario

To verify the fix works:
1. Enter a Fireworks API key
2. Switch to Ollama (local provider)
3. Switch to vLLM (another local provider)
4. Switch to LM Studio (third local provider)
5. Switch back to Fireworks
6. **Expected**: Your Fireworks API key should still be there

**Before the fix**: Step 6 would show an empty field
**After the fix**: Step 6 correctly restores your Fireworks key

---

## General Design Patterns

### When You See Duplicated Logic

If you find yourself copying similar code to multiple files, **STOP** and consider:

1. **Can this be a shared function?** - Extract to a utility module
2. **Is this a lifecycle pattern?** - Create initialization + update wrapper functions
3. **Are the conditions complex?** - Centralize decision-making in ONE place
4. **Will this need to change?** - If yes, you'll need to update N places (brittle!)

### Red Flags

🚩 "I'll just copy this code and modify it slightly"
🚩 "This logic is almost the same as in file X"
🚩 "I need to remember to update this in 3 places"
🚩 "The only difference is initialization vs. updates"

### Green Lights

✅ Single function with options/flags for different contexts
✅ Wrapper functions that call a shared core function
✅ Clear ownership - one file responsible for one concern
✅ Changes require editing only ONE place

---

## Contributing

When you encounter a tricky bug:
1. Add it to this document with:
   - Clear description of the symptom
   - Root cause explanation
   - Why it was hard to spot
   - The fix/design pattern adopted
2. Include code examples (before/after)
3. Describe how to test for regressions

# LLM-DOM-Browser MVP

A desktop application that enables Language Models to analyze and extract information from web content, PDFs, and documents using Electron's WebContentsView architecture.

## Overview

This MVP implements the architecture specified in `LLM-DOM-BROWSER-20251116.md`, providing:

- **Multi-tab content viewing**: WebContentsView-based architecture for isolated renderer processes
- **DOM extraction for LLM**: Serialized DOM access via preload scripts and IPC
- **PDF text extraction**: Native PDF viewing + server-side text extraction for LLM analysis
- **File uploads**: Support for PDFs, text files, and documents
- **LLM integration**: Orchestrator service for coordinating LLM API calls with multi-source context
- **Multi-LLM Provider Support**: Choose from OpenAI, Anthropic, Google Gemini, xAI, OpenRouter, and Fireworks AI (see [MULTI-LLM-PROVIDERS.md](MULTI-LLM-PROVIDERS.md))

## Architecture

```
Main Process (Node.js - Trusted)
├── BaseWindow (Electron UI container)
├── LLM Service (orchestrates queries)
├── PDF Service (text extraction)
└── IPC handlers (main.js:116+ lines)

Renderer Processes (Isolated - Untrusted content)
├── Chat UI View (left sidebar - React-ready)
├── Content View 1 (website/PDF display)
├── Content View 2 (website/PDF display)
└── Preload scripts (safe API exposure via contextBridge)
```

## Directory Structure

```
src/
├── main.js                 # Electron main process, BaseWindow setup
├── preload/
│   ├── content-preload.js  # DOM serialization API
│   └── chat-preload.js     # IPC communication wrapper
├── services/
│   ├── pdf-service.js      # PDF text extraction (pdf-parse)
│   └── llm-orchestrator.js # LLM API coordination
├── providers/              # Multi-LLM provider system
│   ├── base-provider.js    # Base provider class
│   ├── openai-provider.js  # OpenAI integration
│   ├── anthropic-provider.js # Anthropic/Claude integration
│   ├── gemini-provider.js  # Google Gemini integration
│   ├── xai-provider.js     # xAI/Grok integration
│   ├── openrouter-provider.js # OpenRouter integration
│   ├── fireworks-provider.js # Fireworks AI integration
│   ├── provider-factory.js # Provider factory
│   └── models.js           # Model definitions
└── ui/
    └── chat.html           # Chat interface (standalone HTML)

Root:
├── package.json            # Dependencies, scripts
├── TECH-STACK.md           # Version decisions and best practices
├── LLM-DOM-BROWSER-20251116.md  # Design specification
├── MULTI-LLM-PROVIDERS.md  # Multi-provider documentation
└── README.md               # This file
```

## Setup & Running

### Prerequisites

- Node.js 22.20.0+ (comes with Electron 39)
- Electron 39.2.0+ (installed via npm)

### Installation

```bash
npm install --ignore-scripts
npm install  # Or skip this if scripts fail; Electron binaries require special handling
```

### Running the App

```bash
npm start
```

Development mode with hot reload:

```bash
npm run dev
```

## Key Design Decisions

### 1. WebContentsView (Not BrowserView)

- **Why**: BrowserView is deprecated; WebContentsView is the modern Electron approach (v30.0.0+)
- **Benefit**: Aligns with Chromium's Views API, cleaner future upgrades

### 2. Context Isolation & Security

- All WebContentsView instances have `contextIsolation: true`
- Preload scripts use `contextBridge.exposeInMainWorld()` for safe API exposure
- No direct Electron API access from web content
- All untrusted content runs sandboxed

### 3. PDF Strategy

- **Viewing**: Native PDFium viewer (load via `file://` URL)
- **Analysis**: Text extraction in main process using `pdf-parse` (NOT `printToPDF()`)
- Reason: `printToPDF()` is for creating PDFs, not reading them

### 4. DOM Access

- **Async only** by design (Electron process isolation)
- Serialization via preload script's `contextAPI.getSerializedDOM()`
- Returns plain objects with essential content (reduces token count for LLM)

### 5. LLM Integration

- Runs in main process with access to:
  - All WebContentsView instances
  - File system (for PDF extraction)
  - Network (for remote LLM APIs)
- Orchestrator extracts context from multiple tabs before querying

## IPC API Reference

### Main Process Handlers (main.js)

#### `open-tab(url)`

Opens a new content view with given URL or PDF path.

```javascript
const { id, url } = await ipcRenderer.invoke('open-tab', 'https://example.com');
```

#### `close-tab(tabId)`

Closes a content view.

```javascript
await ipcRenderer.invoke('close-tab', tabId);
```

#### `extract-content(tabId)`

Extracts serialized DOM (HTML) or text (PDF) from a view.

```javascript
const content = await ipcRenderer.invoke('extract-content', tabId);
// Returns: { type: 'html'|'pdf', title, url, dom|text }
```

#### `query-llm(query, tabIds, apiKey)`

Sends query to LLM with context from specified tabs.

```javascript
const { response, tokensUsed } = await ipcRenderer.invoke('query-llm', {
  query: "What is this about?",
  tabIds: ['view_xxx', 'view_yyy'],
  apiKey: process.env.OPENAI_API_KEY
});
```

#### `upload-file(filePath, fileName)`

Process uploaded PDF or text file.

```javascript
const { tabId, type, content } = await ipcRenderer.invoke('upload-file', {
  filePath: '/path/to/file.pdf',
  fileName: 'document.pdf'
});
```

## Content API Reference

### Preload: `window.contentAPI`

Exposed via `contextBridge` in content-preload.js.

#### `getSerializedDOM()`

Returns structured DOM data safe for LLM analysis.

```javascript
const domData = await window.contentAPI.getSerializedDOM();
// Returns: { title, url, headings, paragraphs, links, mainContent, metaTags }
```

#### `getPageMetadata()`

Quick metadata extraction.

```javascript
const meta = await window.contentAPI.getPageMetadata();
// Returns: { title, url, description, language }
```

#### `executeCommand(command, args)`

Limited safe commands (read-only).

```javascript
// Find text
const results = await window.contentAPI.executeCommand('find-text', { text: 'keyword' });

// Get text by selector
const text = await window.contentAPI.executeCommand('get-text-by-selector', { selector: '#id' });
```

## Security Features

- ✅ Context isolation enabled on all WebContentsView
- ✅ Node.js disabled (`nodeIntegration: false`)
- ✅ Sandbox enabled for untrusted content
- ✅ Safe API exposure via contextBridge (no raw Electron APIs)
- ✅ File path validation (prevents directory traversal)
- ✅ IPC argument validation in preload scripts
- ✅ No synchronous DOM access (enforced by async architecture)

## Known Limitations & Future Work

1. **LLM API Integration**: Currently returns mock responses. Integrate with OpenAI, Anthropic, or other APIs.
2. **React UI**: Chat UI is vanilla HTML/JS. Can be replaced with React app build.
3. **PDF Per-Page Extraction**: Currently extracts full text. `pdf-parse` returns concatenated text.
4. **State Persistence**: No localStorage for tabs or conversation history.
5. **Multi-window**: Single main window only. Can extend for multiple windows.
6. **Drag & Drop**: Could add drag-drop file upload to content area.

## Environment Variables

```bash
# Optional: Configure custom LLM API endpoint
LLM_API_ENDPOINT=https://api.custom.com/query

# API Keys (prompt user in UI or use env vars)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Building for Distribution

```bash
npm run build
```

This creates installers for macOS, Windows, and Linux using `electron-builder`.

## Development Tips

### Debugging

- **Main Process**: Use Chrome DevTools (Cmd+Shift+I in dev mode)
- **Renderer**: Use same DevTools (F12 or Cmd+Option+I)
- **Console**: Check terminal for console.log output

### Hot Reload

- Modify preload scripts and reload view: `webContents.reload()`
- Modify main.js: Restart entire app

### Testing Content Extraction

```javascript
// In DevTools console on content view:
window.contentAPI.getSerializedDOM().then(console.log)
```

### Memory Management

Monitor WebContentsView cleanup:

```javascript
// Check active views
llmOrchestrator.getBrowserExplanation()

// Clear PDF cache
pdfService.clearCache()
```

## Performance Considerations

- **PDF Extraction**: Cached in memory (LRU, max 10 files)
- **DOM Serialization**: Limits arrays (100 paragraphs, 50 links)
- **LLM Context**: Main content limited to 2000 chars to reduce tokens
- **IPC Overhead**: All communication is async; batch where possible

## References

- [Electron Documentation](https://www.electronjs.org/docs)
- [WebContentsView API](https://www.electronjs.org/docs/latest/api/web-contents-view)
- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [pdf-parse Documentation](https://github.com/modesty/pdf-parse)

## License

MIT

## Feedback & Issues

Report issues or improvements in the project repository.

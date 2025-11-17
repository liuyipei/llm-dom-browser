A MVP with DOM Tree access for LLMs, using Electron.

## Architecture Specification for Your MVP

### Core Design Philosophy

Your MVP needs to handle **three distinct content types**:
1. **Websites** (JavaScript, React, embedded media)
2. **PDF files** (multiple, simultaneous)
3. **Uploaded files** (likely text/docs)

The key insight: **WebContentsView gives you isolated renderer processes per view**, but DOM extraction for LLM analysis still requires async serialization across the process boundary . This is your primary architectural constraint.

---

### Recommended Architecture

```
Main Process (Node.js)
├── BaseWindow (main window)
│   └── contentView (View container)
│       ├── WebContentsView #1 (Website/PDF)
│       ├── WebContentsView #2 (Website/PDF)
│       └── WebContentsView #3 (React UI for LLM chat)
├── LLM Service (remote API calls)
└── File Manager (handle uploads)

Renderer Processes (isolated per view)
├── Each WebContentsView runs its own renderer
├── DOM content must be serialized to send to main process
└── Preload scripts expose safe APIs for content extraction
```

---

### Design Patterns & Common Issues

#### **1. Multi-PDF Handling Strategy**

**Insight**: Chromium's built-in PDFium viewer (available since Electron 9) lets you load PDFs via `loadURL()` just like web pages, but extracting text for LLM analysis requires additional steps .

**Key Issue**: `printToPDF()` on a PDF viewer window produces blank pages or incomplete content . You need two different approaches:

```javascript
// Pattern: Load PDF for viewing (works natively)
const pdfView = new WebContentsView();
pdfView.webContents.loadURL('file:///path/to/document.pdf');

// Pattern: Extract PDF text for LLM (requires separate processing)
// Use a library like pdf-parse in main process, not printToPDF
const pdfText = await extractTextFromPDF(filePath); // Separate step
```

**Design Decision**: Separate "viewing" from "analysis":
- **Viewing**: Use `webContents.loadURL()` with PDFium (native rendering)
- **LLM Analysis**: Extract text using Node.js PDF libraries in main process before loading

```javascript
// Main process: Handle file upload
ipcMain.handle('upload-pdf', async (event, filePath) => {
  // Extract text for LLM
  const text = await pdfParse(fs.readFileSync(filePath));
  // Store in memory/db with reference to original path
  storePDFDocument(filePath, text);
  
  // Create view for user to see the PDF
  const view = new WebContentsView();
  view.webContents.loadURL(`file://${filePath}`);
  return { id: docId, textExcerpt: text.substring(0, 500) };
});
```

---

#### **2. DOM Extraction for LLM Analysis**

**Critical Issue**: You cannot pass DOM objects directly via IPC - they are not serializable . You must serialize to a transferable format.

**Recommended Pattern**: Content script injection with structured serialization:

```javascript
// Preload script (has access to DOM but isolated)
contextBridge.exposeInMainWorld('contentAPI', {
  getSerializedDOM: () => {
    // Extract only what the LLM needs (reduces token count)
    return {
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => ({
        level: h.tagName,
        text: h.textContent
      })),
      paragraphs: Array.from(document.querySelectorAll('p')).map(p => p.textContent),
      links: Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent,
        href: a.href
      })),
      // Add data-llm-* attributes for your custom semantic hints
      customElements: Array.from(document.querySelectorAll('[data-llm-important]')).map(el => ({
        tag: el.tagName,
        content: el.textContent
      }))
    };
  }
});

// Main process: Request DOM from view
async function getDOMForLLM(view) {
  // This is async by design - no synchronous access possible
  const domData = await view.webContents.executeJavaScript(
    'window.contentAPI.getSerializedDOM()'
  );
  return domData;
}
```

**Design Insight**: This pattern is **intentionally async** because Electron's process isolation prevents synchronous DOM access. Atlas's deep integration required custom C++ modules to intercept DOM construction events ; with pure Electron, you must serialize.

---

#### **3. LLM Integration Architecture**

**Key Design Decision**: The LLM service runs in the main process, not in a renderer. This gives it access to:
- All WebContentsView instances
- File system for PDF processing
- Network access to remote LLM APIs

```javascript
// Main process: LLM orchestrator
class LLMOrchestrator {
  constructor() {
    this.activeViews = new Map(); // Track all WebContentsView instances
    this.llmClient = new RemoteLLMClient(apiKey);
  }
  
  async analyzeContent(viewId, query) {
    const view = this.activeViews.get(viewId);
    if (!view) throw new Error('View not found');
    
    // 1. Extract DOM or PDF text
    const content = await this.extractContent(view);
    
    // 2. Build context with browser state
    const context = {
      content,
      url: view.webContents.getURL(),
      title: view.webContents.getTitle(),
      // Browser explanation metadata
      browserCapabilities: this.getBrowserExplanation()
    };
    
    // 3. Send to remote LLM
    return await this.llmClient.query(query, context);
  }
  
  getBrowserExplanation() {
    // Provide LLM with browser capabilities
    return {
      type: 'Electron WebContentsView',
      capabilities: ['navigate', 'click', 'extract_dom', 'execute_js'],
      constraints: ['async_only', 'no_synchronous_dom', 'ipc_required']
    };
  }
}
```

---

### Security Considerations for WebContentsView

Even with WebContentsView, you must explicitly disable Node.js integration:

```javascript
const view = new WebContentsView({
  webPreferences: {
    nodeIntegration: false, // CRITICAL: Disable Node in renderer
    contextIsolation: true, // CRITICAL: Isolate context
    preload: path.join(__dirname, 'preload.js'),
    sandbox: true // RECOMMENDED: Enable sandbox for untrusted content
  }
});
```

**Common Pitfall**: Forgetting to configure security for **each WebContentsView**. Every view needs its own secure `webPreferences` - they don't inherit from the main window .

---

### Complete MVP Specification

```javascript
// main.js - Minimal working pattern
const { app, BaseWindow, WebContentsView, ipcMain } = require('electron');

app.whenReady().then(() => {
  // Create main window using BaseWindow (not BrowserWindow)
  const mainWindow = new BaseWindow({
    width: 1200,
    height: 800
  });

  // Create view for LLM chat UI (React app)
  const chatView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'chat-preload.js')
    }
  });
  chatView.setBounds({ x: 0, y: 0, width: 400, height: 800 });
  mainWindow.contentView.addChildView(chatView);
  chatView.webContents.loadFile('chat-ui.html');

  // Track active content views
  const contentViews = new Map();

  // IPC: Open new tab with URL or PDF
  ipcMain.handle('open-tab', (event, url) => {
    const contentView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'content-preload.js'),
        plugins: true // Enable PDF viewer
      }
    });
    
    contentView.setBounds({ x: 400, y: 0, width: 800, height: 800 });
    mainWindow.contentView.addChildView(contentView);
    
    const tabId = generateId();
    contentViews.set(tabId, contentView);
    
    contentView.webContents.loadURL(url);
    
    return tabId;
  });

  // IPC: Extract content for LLM
  ipcMain.handle('extract-content', async (event, tabId) => {
    const view = contentViews.get(tabId);
    if (!view) return null;
    
    // For PDFs: Check if it's a PDF and use different extraction
    const url = view.webContents.getURL();
    if (url.endsWith('.pdf') || url.includes('.pdf?')) {
      // PDF: Use main-process PDF parser
      const pdfPath = extractFilePathFromURL(url);
      return await parsePDFInMainProcess(pdfPath);
    } else {
      // HTML: Serialize DOM via preload script
      return await view.webContents.executeJavaScript(
        'window.contentAPI.getSerializedDOM()'
      );
    }
  });
});
```

---

### Critical MVP Implementation Notes

1. **PDF Text Extraction**: `webContents.printToPDF()` is for **creating** PDFs, not reading them. For reading PDFs into LLM context, use `pdf-parse` or similar in the main process **before** loading into WebContentsView .

2. **Async Only**: All DOM access is asynchronous. Design your LLM interactions to handle async context gathering.

3. **Memory Management**: Track all WebContentsView instances and call `.destroy()` when tabs close. Electron 39 has improved OSR (Offscreen Rendering) with better shared texture handling .

4. **CSS for printToPDF**: If you generate PDFs from HTML, use `@media print { overflow: visible; }` to prevent scrollbars from truncating content .

5. **Multiple Files**: For "multiple PDF files," create separate WebContentsView instances per file, but extract text centrally in the main process for LLM analysis.


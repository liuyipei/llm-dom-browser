# Tech Stack & Version Decisions

## Current Versions (as of 2025-11-17)

### Runtime
- **Electron**: 39.2.0 (latest as of Nov 17, 2025)
  - Chromium: 142.0.7444.52
  - V8: 14.2
  - Node: 22.20.0
  - 8-week release cadence

### Key Libraries
- **pdf-parse**: ^1.1.1 (for PDF text extraction in main process)

## Architecture Decisions

### WebContentsView (Not BrowserView)
- WebContentsView is the modern, official approach since Electron v30.0.0
- BrowserView is deprecated; do NOT use it
- WebContentsView aligns with Chromium's Views API framework
- Cleaner integration with future Electron updates

### Context Isolation & Security
- Context isolation enabled by default since Electron 12
- REQUIRED: Set `contextIsolation: true` in webPreferences
- REQUIRED: Use `contextBridge.exposeInMainWorld()` for safe API exposure
- NEVER expose raw `ipcRenderer` or Electron APIs directly
- All untrusted web content must run sandboxed

### PDF Handling Strategy
- **Viewing**: Use native PDFium viewer (load via `loadURL('file://...')`)
- **Text Extraction**: Use `pdf-parse` in main process (NOT `printToPDF()`)
- `printToPDF()` is for creating PDFs, not reading them
- Extract text before loading PDF into WebContentsView

### DOM Extraction for LLM
- DOM access is **async only** (process isolation enforced)
- Use `webContents.executeJavaScript()` to call serialization functions
- Return plain serialized objects (no DOM nodes, no functions)
- Minimize data sent (reduce LLM token count)

## Known Limitations & Workarounds

1. **No synchronous DOM access**: By design, Electron enforces process boundaries
2. **IPC is async**: All communication between main and renderer is asynchronous
3. **Memory management**: Track all WebContentsView instances and call `.destroy()` when closed
4. **PDF scrollbars in printToPDF**: Use `@media print { overflow: visible; }`

## Security Checklist

- [ ] All WebContentsView has `nodeIntegration: false`
- [ ] All WebContentsView has `contextIsolation: true`
- [ ] All WebContentsView has `sandbox: true` for untrusted content
- [ ] Preload scripts use `contextBridge.exposeInMainWorld()` only
- [ ] No raw Electron/IPC API exposed to web content
- [ ] File paths validated before loading
- [ ] PDF extraction happens in main process (trusted)

## Future Considerations

- Electron 40+ (current release cadence)
- V8 garbage collection improvements in newer versions
- Potential improvements to OSR (Offscreen Rendering) for better texture handling

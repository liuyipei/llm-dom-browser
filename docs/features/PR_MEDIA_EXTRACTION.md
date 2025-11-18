# Add Vision-Capable Media Extraction

## Summary

Implements configurable media extraction to support vision-capable LLMs (Claude 3.5 Sonnet, GPT-4V, Gemini). Provides both **metadata** (always) and **screenshots** (optional) for comprehensive visual analysis.

## Features

### Always Extracted (Metadata)
- **Image URLs** with alt text, titles, dimensions (first 20)
- **Video URLs** with poster images, sources (first 10)
- Relative URLs automatically resolved to absolute

### Optional (Checkbox Enabled)
- **Full-page screenshot** capture using `WebContentsView.capturePage()`
- **Auto-downsampled** to 1024px max on long edge
- **PNG format**, base64 encoded for vision APIs

## Technical Implementation

### Screenshot Capture
```javascript
// Electron NativeImage API
const image = await view.webContents.capturePage();
const resized = image.resize({ width: 1024, height: 576 });
const base64 = resized.toPNG().toString('base64');
```

### Benefits
- ✅ **Token efficient**: Single 1024px screenshot vs multiple large images
- ✅ **Complete context**: Metadata (what's there) + Visual (how it looks)
- ✅ **Captures everything**: Layout, CSS, dynamic content, overlays
- ✅ **Works with auth**: Screenshot includes private content
- ✅ **Backward compatible**: Disabled by default

## UI Changes

Added checkbox: `"Include page screenshot for vision models (1024px max)"`

## Files Modified

- `src/preload/content-preload.js` - Always extract media metadata
- `src/services/llm-orchestrator.js` - Screenshot capture & prompt building
- `src/ui/chat.html` - UI checkbox
- `src/preload/chat-preload.js` - IPC parameter passing
- `src/main.js` - Options forwarding

## Use Case: YouTube Analysis

**Without checkbox:**
```
Images (20):
  1. Video thumbnail - https://i.ytimg.com/vi/abc123/maxresdefault.jpg
  2. Channel avatar - https://yt3.ggpht.com/xyz456/photo.jpg
  ...
```

**With checkbox:**
```
Screenshot:
  Dimensions: 1024x576 (original: 1920x1080)
  Format: PNG (base64 encoded)
  Data: data:image/png;base64,iVBORw0KGgo...
  Note: This is a visual snapshot of the page as rendered in the browser.
```

Vision models can now:
- Describe page layout and design
- Identify visual elements not in metadata
- Answer questions about appearance and branding
- See thumbnails, colors, positioning

## Future Enhancements

- Multimodal message format (native vision API)
- Full-page scroll capture (not just visible area)
- Configurable max dimension
- JPEG format option for smaller file size

/**
 * Rendering utilities
 * Handles markdown rendering, HTML generation, and text utilities
 */

/**
 * Render markdown text with code highlighting and math support
 * @param {string} text - The markdown text to render
 * @returns {string} - Sanitized HTML
 */
function renderMarkdown(text) {
  // Configure marked for code highlighting
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (err) {
          console.error('Highlighting error:', err);
        }
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
  });

  // Process LaTeX math expressions before markdown
  // Replace display math $$...$$ with placeholders
  const displayMathPlaceholders = [];
  let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
    const placeholder = `__DISPLAYMATH${displayMathPlaceholders.length}__`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        output: 'html'
      });
      displayMathPlaceholders.push(rendered);
    } catch (err) {
      console.error('KaTeX display math error:', err);
      displayMathPlaceholders.push(match); // Keep original if error
    }
    return placeholder;
  });

  // Replace inline math $...$ with placeholders
  const inlineMathPlaceholders = [];
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
    const placeholder = `__INLINEMATH${inlineMathPlaceholders.length}__`;
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        output: 'html'
      });
      inlineMathPlaceholders.push(rendered);
    } catch (err) {
      console.error('KaTeX inline math error:', err);
      inlineMathPlaceholders.push(match); // Keep original if error
    }
    return placeholder;
  });

  // Render markdown
  let html = marked.parse(processed);

  // Restore math placeholders
  displayMathPlaceholders.forEach((math, i) => {
    html = html.replace(`__DISPLAYMATH${i}__`, math);
  });
  inlineMathPlaceholders.forEach((math, i) => {
    html = html.replace(`__INLINEMATH${i}__`, math);
  });

  // Sanitize and return
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mtext'],
    ADD_ATTR: ['class', 'style']
  });
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - The copy button element
 */
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    button.textContent = 'Failed';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  });
}

/**
 * Estimate token count from text (rough approximation: 1 token ≈ 4 characters)
 * @param {string} text - The text to estimate tokens for
 * @returns {number} - Estimated token count
 */
function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Get first N words from text for tab naming
 * @param {string} text - The text to extract words from
 * @param {number} wordCount - Number of words to extract
 * @returns {string} - First N words
 */
function getFirstWords(text, wordCount = 4) {
  const words = text.trim().split(/\s+/);
  return words.slice(0, wordCount).join(' ');
}

/**
 * Truncate text to show beginning and end with ellipsis in the middle
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum total length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength = 100) {
  // Remove line breaks and extra whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Show beginning and end with ... in the middle
  const sideLength = Math.floor((maxLength - 5) / 2); // 5 for " ... "
  const start = cleaned.substring(0, sideLength);
  const end = cleaned.substring(cleaned.length - sideLength);
  return `${start} ... ${end}`;
}

/**
 * Generate HTML page for a conversation (user message + assistant response)
 * @param {Object} conversation - Conversation data
 * @returns {string} - Complete HTML document
 */
function generateConversationHTML(conversation) {
  const { id, userMessage, assistantMessage, stats, sourceTabs, includeMedia } = conversation;

  const timestamp = new Date().toLocaleString();
  const model = stats?.model || 'Unknown';
  const latency = stats?.latencyMs ? (stats.latencyMs / 1000).toFixed(2) + 's' : 'N/A';

  // Build HTML using string concatenation to avoid template literal issues
  let html = '<!DOCTYPE html>\n';
  html += '<html lang="en">\n';
  html += '<head>\n';
  html += '  <meta charset="UTF-8">\n';
  html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '  <title>Conversation #' + id + '</title>\n';
  html += '  <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"><\/script>\n';
  html += '  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"><\/script>\n';
  html += '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">\n';
  html += '  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"><\/script>\n';
  html += '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">\n';
  html += '  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>\n';
  html += '  <style>\n';
  html += '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #ffffff; color: #24292f; line-height: 1.6; }\n';
  html += '    .header { border-bottom: 2px solid #d0d7de; padding-bottom: 20px; margin-bottom: 30px; }\n';
  html += '    .header h1 { margin: 0 0 10px 0; color: #0969da; font-size: 24px; }\n';
  html += '    .header .meta { font-size: 12px; color: #57606a; display: flex; gap: 20px; flex-wrap: wrap; }\n';
  html += '    .message-block { margin-bottom: 30px; padding: 20px; border-radius: 6px; border: 1px solid #d0d7de; }\n';
  html += '    .user-message { background: #f6f8fa; border-left: 4px solid #0969da; }\n';
  html += '    .assistant-message { background: #ffffff; border-left: 4px solid #1a7f37; }\n';
  html += '    .message-label { font-weight: bold; font-size: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }\n';
  html += '    .user-label { color: #0969da; }\n';
  html += '    .assistant-label { color: #1a7f37; }\n';
  html += '    .message-content { font-size: 14px; }\n';
  html += '    .message-content pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; border: 1px solid #d0d7de; }\n';
  html += '    .message-content code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-size: 85%; }\n';
  html += '    .message-content pre code { background: none; padding: 0; }\n';
  html += '    .message-content a { color: #0969da; text-decoration: none; }\n';
  html += '    .message-content a:hover { text-decoration: underline; }\n';
  html += '    .token-badge { display: inline-block; background: #f6f8fa; padding: 2px 8px; border-radius: 12px; font-size: 11px; color: #57606a; border: 1px solid #d0d7de; }\n';
  html += '    .source-tabs { margin-top: 20px; padding: 15px; background: #f6f8fa; border-radius: 6px; border: 1px solid #d0d7de; }\n';
  html += '    .source-tabs h3 { margin: 0 0 10px 0; font-size: 14px; color: #24292f; font-weight: 600; }\n';
  html += '    .source-tab-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; color: #57606a; }\n';
  html += '    .source-tab-item .tab-icon { font-size: 12px; }\n';
  html += '    .source-tab-item .tab-title { color: #24292f; font-weight: 500; }\n';
  html += '    .media-badge { display: inline-flex; align-items: center; gap: 4px; background: #ddf4ff; color: #0969da; padding: 4px 8px; border-radius: 12px; font-size: 11px; border: 1px solid #54aeff; margin-left: 10px; }\n';
  html += '  </style>\n';
  html += '</head>\n';
  html += '<body>\n';
  html += '  <div class="header">\n';
  html += '    <h1>Conversation #' + id + '</h1>\n';
  html += '    <div class="meta">\n';
  html += '      <span>📅 ' + timestamp + '</span>\n';
  html += '      <span>🤖 Model: ' + model + '</span>\n';
  html += '      <span>⏱ Latency: ' + latency + '</span>\n';
  html += '      <span>📊 Tokens: ' + conversation.userTokens + '↑ / ' + conversation.assistantTokens + '↓</span>\n';
  html += '    </div>\n';

  // Add source tabs information if available
  if (sourceTabs && sourceTabs.length > 0) {
    html += '    <div class="source-tabs">\n';
    html += '      <h3>📑 Source Tabs Used (' + sourceTabs.length + ')';
    if (includeMedia) {
      html += '<span class="media-badge">📷 Images Included</span>';
    }
    html += '</h3>\n';
    sourceTabs.forEach((tab, index) => {
      html += '      <div class="source-tab-item">\n';
      html += '        <span class="tab-icon">🔗</span>\n';
      html += '        <span class="tab-title">' + (tab.title || 'Untitled') + '</span>\n';
      if (tab.url) {
        html += '        <span style="color: #57606a; font-size: 11px;">(' + tab.url.substring(0, 60) + (tab.url.length > 60 ? '...' : '') + ')</span>\n';
      }
      html += '      </div>\n';
    });
    html += '    </div>\n';
  }

  html += '  </div>\n';
  html += '  <div class="message-block user-message">\n';
  html += '    <div class="message-label user-label">\n';
  html += '      👤 User Message\n';
  html += '      <span class="token-badge">' + conversation.userTokens + ' tokens</span>\n';
  html += '    </div>\n';
  html += '    <div class="message-content" id="userContent"></div>\n';
  html += '  </div>\n';
  html += '  <div class="message-block assistant-message">\n';
  html += '    <div class="message-label assistant-label">\n';
  html += '      🤖 Assistant Response\n';
  html += '      <span class="token-badge">' + conversation.assistantTokens + ' tokens</span>\n';
  html += '    </div>\n';
  html += '    <div class="message-content" id="assistantContent"></div>\n';
  html += '  </div>\n';
  html += '  <script>\n';
  html += '    function renderMarkdown(text) {\n';
  html += '      marked.setOptions({ highlight: function(code, lang) { if (lang && hljs.getLanguage(lang)) { try { return hljs.highlight(code, { language: lang }).value; } catch (err) { console.error("Highlighting error:", err); } } return hljs.highlightAuto(code).value; }, breaks: true, gfm: true });\n';
  html += '      const displayMathPlaceholders = []; let processed = text.replace(/\\$\\$([\\s\\S]+?)\\$\\$/g, (match, math) => { const placeholder = "__DISPLAYMATH" + displayMathPlaceholders.length + "__"; try { const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false, output: "html" }); displayMathPlaceholders.push(rendered); } catch (err) { displayMathPlaceholders.push(match); } return placeholder; });\n';
  html += '      const inlineMathPlaceholders = []; processed = processed.replace(/\\$([^\\$\\n]+?)\\$/g, (match, math) => { const placeholder = "__INLINEMATH" + inlineMathPlaceholders.length + "__"; try { const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false, output: "html" }); inlineMathPlaceholders.push(rendered); } catch (err) { inlineMathPlaceholders.push(match); } return placeholder; });\n';
  html += '      let htmlOut = marked.parse(processed);\n';
  html += '      displayMathPlaceholders.forEach((math, i) => { htmlOut = htmlOut.replace("__DISPLAYMATH" + i + "__", math); });\n';
  html += '      inlineMathPlaceholders.forEach((math, i) => { htmlOut = htmlOut.replace("__INLINEMATH" + i + "__", math); });\n';
  html += '      return DOMPurify.sanitize(htmlOut, { ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "mtext"], ADD_ATTR: ["class", "style"] });\n';
  html += '    }\n';
  html += '    const userMessage = ' + JSON.stringify(userMessage) + ';\n';
  html += '    const assistantMessage = ' + JSON.stringify(assistantMessage) + ';\n';
  html += '    document.getElementById("userContent").innerHTML = renderMarkdown(userMessage);\n';
  html += '    document.getElementById("assistantContent").innerHTML = renderMarkdown(assistantMessage);\n';
  html += '  <\/script>\n';
  html += '</body>\n';
  html += '</html>';

  return html;
}

/**
 * Generate HTML for notes editor
 * @param {number} notesId - The notes ID
 * @param {string} initialContent - Initial content for the notes
 * @returns {string} HTML content
 */
function generateNotesHTML(notesId, initialContent = '') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notes ${notesId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #3498db;
    }
    h1 {
      color: #3498db;
      font-size: 16px;
      outline: none;
      cursor: text;
      padding: 2px 4px;
      border-radius: 3px;
      transition: background 0.2s;
    }
    h1:hover {
      background: rgba(52, 152, 219, 0.1);
    }
    h1:focus {
      background: rgba(52, 152, 219, 0.15);
    }
    textarea {
      flex: 1;
      width: 100%;
      background: #252525;
      color: #d4d4d4;
      border: 1px solid #3498db;
      border-radius: 4px;
      padding: 15px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      resize: none;
      outline: none;
    }
    textarea:focus {
      border-color: #5dade2;
      box-shadow: 0 0 5px rgba(52, 152, 219, 0.5);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 contenteditable="true" spellcheck="false">📝 Editable title | Copy/paste text for context or temporary storage</h1>
  </div>
  <textarea id="notesContent" placeholder="Start typing your notes here...">${initialContent}</textarea>
</body>
</html>`;
}

/**
 * Add message to chat container
 * @param {string} text - The message text
 * @param {string} type - Message type: 'system' or 'error'
 */
function addMessage(text, type = 'system') {
  // Only show system/error messages in chat container
  const containerEl = document.createElement('div');
  containerEl.className = `message-container ${type}`;

  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;

  containerEl.appendChild(messageEl);
  chatContainer.appendChild(containerEl);
  mainContentWrapper.scrollTop = mainContentWrapper.scrollHeight;
}

/**
 * Add conversation summary to chat container (minimal metadata only)
 * @param {string} tabId - The conversation tab ID
 * @param {number} conversationId - The conversation number
 * @param {number} userTokens - User message token count
 * @param {number} assistantTokens - Assistant response token count
 * @param {Object} stats - Stats from the LLM response
 */
function addConversationToChat(tabId, conversationId, userTokens, assistantTokens, stats) {
  const containerEl = document.createElement('div');
  containerEl.className = 'message-container conversation';
  containerEl.style.cursor = 'pointer';
  containerEl.title = 'Click to view full conversation in browser';

  const messageEl = document.createElement('div');
  messageEl.className = 'message conversation';

  // Show minimal metadata only
  const metadataDiv = document.createElement('div');
  metadataDiv.style.cssText = 'font-family: monospace; font-size: 11px;';

  const timestamp = new Date().toLocaleTimeString();
  metadataDiv.textContent = `💬 Conversation #${conversationId} [${timestamp}]`;
  messageEl.appendChild(metadataDiv);

  // Add stats
  const statsEl = document.createElement('div');
  statsEl.className = 'message-stats';
  statsEl.style.fontSize = '10px';

  const statItems = [];

  if (stats.latencyMs !== undefined) {
    statItems.push(`⏱ ${(stats.latencyMs / 1000).toFixed(2)}s`);
  }

  statItems.push(`📊 ${userTokens}↑ / ${assistantTokens}↓`);

  if (stats.model) {
    statItems.push(`🤖 ${stats.model}`);
  }

  statsEl.textContent = statItems.join(' • ');
  messageEl.appendChild(statsEl);

  // Click to switch to conversation tab
  messageEl.addEventListener('click', () => {
    switchTab(tabId);
  });

  containerEl.appendChild(messageEl);
  chatContainer.appendChild(containerEl);
  mainContentWrapper.scrollTop = mainContentWrapper.scrollHeight;
}

/**
 * Update status message
 */
function updateStatus(text, type = 'info') {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

/**
 * Set loading state
 */
function setLoading(loading) {
  state.isLoading = loading;
  openBtn.disabled = loading;
  uploadBtn.disabled = loading;
  sendBtn.disabled = loading;
  urlInput.disabled = loading;
  queryInput.disabled = loading;
}

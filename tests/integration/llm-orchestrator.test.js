jest.mock('../../src/providers/provider-factory');
const ProviderFactory = require('../../src/providers/provider-factory');
const LLMOrchestrator = require('../../src/services/llm-orchestrator');

describe('🤖 LLM Orchestrator Multi-Tab Context Tests', () => {
  let orchestrator;
  let mockWebContentsView;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new LLMOrchestrator();

    mockWebContentsView = {
      webContents: {
        getURL: jest.fn().mockReturnValue('https://example.com'),
        getTitle: jest.fn().mockReturnValue('Test Page'),
        executeJavaScript: jest.fn().mockResolvedValue({
          title: 'Test Page',
          url: 'https://example.com',
          mainContent: 'This is the main content',
          headings: [{ level: 'h1', text: 'Heading 1' }],
          paragraphs: [{ text: 'Paragraph text' }]
        })
      }
    };

    // Mock ProviderFactory
    const mockProvider = {
      generateCompletion: jest.fn().mockResolvedValue('LLM Response')
    };
    ProviderFactory.createProvider.mockReturnValue(mockProvider);
  });

  test('✅ Single tab content extraction', async () => {
    orchestrator.setContentViews(new Map([[1, mockWebContentsView]]));

    const context = await orchestrator._extractContextFromTabs([1]);

    expect(context.length).toBe(1);
    expect(context[0].type).toBe('html');
    expect(context[0].url).toBe('https://example.com');
    global.testLog('  ✓ Extracted content from 1 tab');
  });

  test('✅ Multi-tab context compilation', async () => {
    const tabs = new Map([
      [1, mockWebContentsView],
      [2, { ...mockWebContentsView }],
      [3, { ...mockWebContentsView }]
    ]);
    orchestrator.setContentViews(tabs);

    const context = await orchestrator._extractContextFromTabs([1, 2, 3]);

    expect(context.length).toBe(3);
    expect(context.every(c => c.type === 'html')).toBe(true);
    global.testLog('  ✓ Extracted content from 3 tabs');
  });

  test('✅ Prompt building with serialized DOM', () => {
    const contextItems = [
      {
        tabId: 1,
        type: 'html',
        title: 'Test Page',
        url: 'https://example.com',
        dom: {
          title: 'Test Page',
          mainContent: 'Main content here',
          headings: [{ level: 'h1', text: 'Title' }],
          paragraphs: [{ text: 'Para 1' }, { text: 'Para 2' }]
        }
      }
    ];

    const prompt = orchestrator._buildPrompt('What is this about?', contextItems);

    expect(prompt).toContain('What is this about?');
    expect(prompt).toContain('Test Page');
    expect(prompt).toContain('Main content here');
    expect(prompt).toContain('Title');
    global.testLog('  ✓ Prompt built with DOM data (content, headings, paragraphs)');
  });

  test('✅ Invalid query handling', async () => {
    const result = await orchestrator.analyzeContent(
      null,
      [1],
      'test-key'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid query');
    global.testLog('  ✓ Rejected null query');
  });

  test('✅ Missing tab ID handling', async () => {
    orchestrator.setContentViews(new Map([[1, mockWebContentsView]]));

    const context = await orchestrator._extractContextFromTabs([999]);

    expect(context.length).toBe(0);
    global.testLog('  ✓ Handled missing tab ID gracefully');
  });

  test('✅ Request history tracking', async () => {
    orchestrator.setContentViews(new Map([[1, mockWebContentsView]]));

    const mockProvider = {
      generateCompletion: jest.fn().mockResolvedValue('Response 1')
    };
    ProviderFactory.createProvider.mockReturnValue(mockProvider);

    await orchestrator.analyzeContent('Test query', [1], 'api-key');
    await orchestrator.analyzeContent('Second query', [1], 'api-key');

    // Check internal history array directly
    expect(orchestrator.requestHistory.length).toBe(2);
    expect(orchestrator.requestHistory[0].query).toBe('Test query');
    expect(orchestrator.requestHistory[1].query).toBe('Second query');
    global.testLog('  ✓ Tracked 2 requests in history');
  });

  test('✅ Provider switching during session', async () => {
    orchestrator.setContentViews(new Map([[1, mockWebContentsView]]));

    const mockProvider1 = {
      generateCompletion: jest.fn().mockResolvedValue('OpenAI response')
    };
    const mockProvider2 = {
      generateCompletion: jest.fn().mockResolvedValue('Anthropic response')
    };

    ProviderFactory.createProvider
      .mockReturnValueOnce(mockProvider1)
      .mockReturnValueOnce(mockProvider2);

    const result1 = await orchestrator.analyzeContent('Query', [1], 'key', 'openai');
    const result2 = await orchestrator.analyzeContent('Query', [1], 'key', 'anthropic');

    expect(result1.provider).toBe('openai');
    expect(result2.provider).toBe('anthropic');
    global.testLog('  ✓ Switched providers (OpenAI → Anthropic)');
  });

  test('✅ Content size limiting', () => {
    const contextItems = Array(20).fill(null).map((_, i) => ({
      tabId: i,
      type: 'html',
      title: `Tab ${i}`,
      url: `https://example${i}.com`,
      dom: {
        title: `Tab ${i}`,
        mainContent: 'x'.repeat(1000),
        paragraphs: Array(100).fill({ text: 'para' })
      }
    }));

    const prompt = orchestrator._buildPrompt('Query', contextItems.slice(0, 3));

    // Prompt should be built without errors
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('Tab 0');
    global.testLog(`  ✓ Prompt built from 3 tabs (${prompt.length} chars)`);
  });

  test('✅ History size limit enforced', () => {
    orchestrator.maxHistory = 5;

    for (let i = 0; i < 10; i++) {
      orchestrator._addToHistory({ query: `Query ${i}` });
    }

    // Check internal history array directly
    expect(orchestrator.requestHistory.length).toBeLessThanOrEqual(5);
    global.testLog(`  ✓ History limited to ${orchestrator.requestHistory.length} entries (max 5)`);
  });

  test('✅ Content views tracking', () => {
    const views = new Map([[1, mockWebContentsView], [2, mockWebContentsView]]);
    orchestrator.setContentViews(views);

    expect(orchestrator.contentViews.size).toBe(2);
    expect(orchestrator.contentViews.get(1)).toBe(mockWebContentsView);
    global.testLog('  ✓ Content views tracked correctly');
  });
});

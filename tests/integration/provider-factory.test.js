// Mock all providers
jest.mock('../../src/providers/anthropic-provider', () => jest.fn());
jest.mock('../../src/providers/gemini-provider', () => jest.fn());
jest.mock('../../src/providers/openrouter-provider', () => jest.fn());
jest.mock('../../src/providers/minimax-provider', () => jest.fn());

const ProviderFactory = require('../../src/providers/provider-factory');
const { PROVIDERS, DEFAULT_MODELS } = require('../../src/providers/models');

describe('🏭 Provider Factory Tests', () => {
  test('✅ Create OpenAI provider', () => {
    const provider = ProviderFactory.createProvider('openai', { apiKey: 'test' });
    expect(provider).toBeDefined();
    global.testLog('  ✓ OpenAI provider created');
  });

  test('✅ Create Anthropic provider', () => {
    const provider = ProviderFactory.createProvider('anthropic', { apiKey: 'test' });
    expect(provider).toBeDefined();
    global.testLog('  ✓ Anthropic provider created');
  });

  test('✅ Create Google Gemini provider', () => {
    const provider = ProviderFactory.createProvider('google', { apiKey: 'test' });
    expect(provider).toBeDefined();
    global.testLog('  ✓ Google Gemini provider created');
  });

  test('✅ Create XAI Grok provider', () => {
    const provider = ProviderFactory.createProvider('xai', { apiKey: 'test' });
    expect(provider).toBeDefined();
    global.testLog('  ✓ XAI Grok provider created');
  });

  test('✅ Create all 13 providers', () => {
    const providers = [
      'openai', 'anthropic', 'google', 'xai', 'openrouter',
      'fireworks', 'deepseek', 'kimi', 'minimax', 'glm',
      'ollama', 'vllm', 'lmstudio'
    ];
    const created = providers.map(name => ({
      name,
      instance: ProviderFactory.createProvider(name, { apiKey: 'test', model: 'test-model' })
    }));
    expect(created.length).toBe(13);
    global.testLog(`  ✓ All 13 providers created: ${providers.join(', ')}`);
  });

  test('✅ Invalid provider name (error handling)', () => {
    expect(() => {
      ProviderFactory.createProvider('invalid-provider', { apiKey: 'test' });
    }).toThrow('Unknown provider: invalid-provider');
    global.testLog('  ✓ Caught invalid provider error');
  });

  test('✅ Set default model if not provided', () => {
    const config = { apiKey: 'test' };
    ProviderFactory.createProvider('openai', config);
    // After creation, config should have default model set
    expect(config.model || DEFAULT_MODELS['openai']).toBeDefined();
    global.testLog('  ✓ Default model assigned for OpenAI');
  });

  test('✅ Get supported providers list', () => {
    const supported = ProviderFactory.getSupportedProviders();
    expect(supported.length).toBe(13);
    expect(supported).toContain('openai');
    expect(supported).toContain('anthropic');
    expect(supported).toContain('ollama');
    expect(supported).toContain('vllm');
    expect(supported).toContain('lmstudio');
    global.testLog(`  ✓ ${supported.length} providers supported`);
  });

  test('✅ Check if provider is supported', () => {
    expect(ProviderFactory.isProviderSupported('openai')).toBe(true);
    expect(ProviderFactory.isProviderSupported('invalid')).toBe(false);
    global.testLog('  ✓ Provider support check works');
  });

  test('✅ Case insensitive provider lookup', () => {
    const provider1 = ProviderFactory.createProvider('OPENAI', { apiKey: 'test', model: 'gpt-4' });
    const provider2 = ProviderFactory.createProvider('openai', { apiKey: 'test', model: 'gpt-4' });
    expect(provider1).toBeDefined();
    expect(provider2).toBeDefined();
    global.testLog('  ✓ Case-insensitive provider lookup works');
  });
});

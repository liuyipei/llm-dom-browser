const BaseProvider = require('../../src/providers/base-provider');

describe('🔄 Retry Logic & Error Handling Tests', () => {
  let provider;

  beforeEach(() => {
    jest.useFakeTimers();
    provider = new BaseProvider({ apiKey: 'test', timeout: 1000, maxRetries: 3 });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('✅ Retry on 429 rate limit', async () => {
    global.fetch
      .mockResolvedValueOnce({ status: 429, headers: new Map([['retry-after', '0']]) })
      .mockResolvedValueOnce({ status: 200, ok: true });

    const responsePromise = provider.fetchWithRetry('https://api.example.com', {});
    await jest.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    global.testLog('  ✓ Retried after 429 rate limit (2 attempts)');
  });

  test('✅ Retry on 5xx server error', async () => {
    global.fetch
      .mockResolvedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200, ok: true });

    const responsePromise = provider.fetchWithRetry('https://api.example.com', {});
    await jest.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    global.testLog('  ✓ Retried after 5xx errors (3 attempts)');
  });

  test('✅ Timeout configuration set correctly', () => {
    const customProvider = new BaseProvider({ apiKey: 'test', timeout: 5000, maxRetries: 2 });

    expect(customProvider.timeout).toBe(5000);
    expect(customProvider.maxRetries).toBe(2);
    global.testLog('  ✓ Timeout configured: 5000ms, max retries: 2');
  });

  test('✅ Max retry limit enforced', async () => {
    provider.maxRetries = 2;
    global.fetch
      .mockResolvedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ status: 500 });

    const responsePromise = provider.fetchWithRetry('https://api.example.com', {});
    await jest.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(500);
    expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    global.testLog('  ✓ Stopped retrying at max retry limit (3 total attempts)');
  });

  test('✅ Network error retry', async () => {
    global.fetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ status: 200, ok: true });

    const responsePromise = provider.fetchWithRetry('https://api.example.com', {});
    await jest.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    global.testLog('  ✓ Retried after network error (2 attempts)');
  });

  test('✅ Success on first try (no retry)', async () => {
    global.fetch.mockResolvedValueOnce({ status: 200, ok: true });

    const response = await provider.fetchWithRetry('https://api.example.com', {});

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    global.testLog('  ✓ No retry on immediate success');
  });

  test('✅ Sleep helper works', async () => {
    const sleepPromise = provider.sleep(50);
    jest.advanceTimersByTime(50);
    await sleepPromise;

    expect(true).toBe(true); // Sleep completed without error
    global.testLog(`  ✓ Sleep delay: 50ms (using fake timers)`);
  });

  test('✅ Validate config throws on missing fields', () => {
    const badProvider = new BaseProvider({});
    expect(() => {
      badProvider.validateConfig(['apiKey']);
    }).toThrow('apiKey is required');
    global.testLog('  ✓ Config validation caught missing apiKey');
  });

  test('✅ Format error messages from API response', async () => {
    const response = {
      status: 400,
      statusText: 'Bad Request',
      json: jest.fn().mockResolvedValue({ error: { message: 'Invalid input' } })
    };

    const msg = await provider.formatErrorMessage(response);
    expect(msg).toContain('Invalid input');
    global.testLog('  ✓ Error message formatted from API response');
  });
});

/**
 * Tests for error handling utilities
 */

const { handleAsyncError, createErrorResult } = require('../../src/utils');

describe('Error Utilities', () => {
  describe('createErrorResult', () => {
    it('should create error result from Error object', () => {
      const error = new Error('Test error');
      const result = createErrorResult(error);

      expect(result).toEqual({
        success: false,
        error: 'Test error'
      });
    });

    it('should create error result from string', () => {
      const result = createErrorResult('String error');

      expect(result).toEqual({
        success: false,
        error: 'String error'
      });
    });

    it('should handle null/undefined errors', () => {
      const result = createErrorResult(null);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('handleAsyncError', () => {
    it('should wrap successful async function', async () => {
      const fn = async (x, y) => x + y;
      const wrapped = handleAsyncError(fn);

      const result = await wrapped(2, 3);
      expect(result).toBe(5);
    });

    it('should catch and return error result for failed async function', async () => {
      const fn = async () => {
        throw new Error('Async failure');
      };
      const wrapped = handleAsyncError(fn);

      const result = await wrapped();
      expect(result).toEqual({
        success: false,
        error: 'Async failure'
      });
    });

    it('should preserve function arguments', async () => {
      const fn = async (a, b, c) => ({ a, b, c });
      const wrapped = handleAsyncError(fn);

      const result = await wrapped(1, 'test', true);
      expect(result).toEqual({ a: 1, b: 'test', c: true });
    });

    it('should handle synchronous errors in async function', async () => {
      const fn = async () => {
        JSON.parse('invalid json');
      };
      const wrapped = handleAsyncError(fn);

      const result = await wrapped();
      expect(result).toHaveProperty('success', false);
      expect(result.error).toContain('JSON');
    });
  });
});

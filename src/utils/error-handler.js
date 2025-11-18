/**
 * Error Handler Utilities
 * Provides consistent error handling patterns across the application
 */

/**
 * Wrap an async function with consistent error handling
 * @param {Function} fn - The async function to wrap
 * @param {string} errorMessage - Custom error message prefix
 * @returns {Promise<any>} - Result from the function
 * @throws {Error} - Re-throws error after logging
 */
async function handleAsyncError(fn, errorMessage) {
  try {
    return await fn();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw error;
  }
}

/**
 * Wrap an async function with error handling that returns success/error object
 * @param {Function} fn - The async function to wrap
 * @param {string} errorMessage - Custom error message prefix
 * @returns {Promise<Object>} - { success: boolean, error?: string, ...result }
 */
async function handleAsyncErrorWithResult(fn, errorMessage) {
  try {
    const result = await fn();
    return { success: true, ...result };
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Wrap a synchronous function with consistent error handling
 * @param {Function} fn - The function to wrap
 * @param {string} errorMessage - Custom error message prefix
 * @returns {any} - Result from the function
 * @throws {Error} - Re-throws error after logging
 */
function handleSyncError(fn, errorMessage) {
  try {
    return fn();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw error;
  }
}

/**
 * Create an error result object (for IPC handlers)
 * @param {Error} error - The error object
 * @param {string} message - Custom message
 * @returns {Object} - { success: false, error: string }
 */
function createErrorResult(error, message = 'Operation failed') {
  console.error(message, error);
  return {
    success: false,
    error: error.message || message
  };
}

module.exports = {
  handleAsyncError,
  handleAsyncErrorWithResult,
  handleSyncError,
  createErrorResult
};

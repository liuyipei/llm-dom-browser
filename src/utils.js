/**
 * Utility functions for the application
 */

const path = require('path');

/**
 * Generate a unique ID for tabs/views
 */
function generateId() {
  return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate file path to prevent directory traversal attacks
 * Uses path normalization to detect all traversal attempts
 */
function isValidFilePath(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return false;
  }

  // Require absolute paths
  if (!path.isAbsolute(filePath)) {
    return false;
  }

  // Normalize and resolve to detect traversal
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(filePath);

  // If normalization changes the path significantly, it may be malicious
  if (normalized !== resolved) {
    return false;
  }

  // Check for directory traversal patterns
  if (filePath.includes('..') || normalized.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Extract actual file path from file:// URL
 */
function extractFilePathFromURL(url) {
  if (url.startsWith('file://')) {
    return decodeURIComponent(url.substring(7));
  }
  return url;
}

/**
 * Handle async errors with consistent error response format
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function that catches errors
 */
function handleAsyncError(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Async error:', error);
      return createErrorResult(error);
    }
  };
}

/**
 * Create standardized error result object
 * @param {Error|string} error - Error object or message
 * @returns {Object} - Standardized error result
 */
function createErrorResult(error) {
  const message = error?.message || String(error);
  return {
    success: false,
    error: message
  };
}

module.exports = {
  generateId,
  isValidFilePath,
  extractFilePathFromURL,
  handleAsyncError,
  createErrorResult
};

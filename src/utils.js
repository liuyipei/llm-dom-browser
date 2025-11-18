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

module.exports = {
  generateId,
  isValidFilePath,
  extractFilePathFromURL
};

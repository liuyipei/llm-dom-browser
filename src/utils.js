/**
 * Utility functions for the application
 */

/**
 * Generate a unique ID for tabs/views
 */
function generateId() {
  return `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate file path to prevent directory traversal attacks
 */
function isValidFilePath(filePath) {
  // Basic validation - in production, use more robust checks
  return typeof filePath === 'string' && filePath.length > 0 && !filePath.includes('..');
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

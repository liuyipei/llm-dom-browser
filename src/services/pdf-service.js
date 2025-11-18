/**
 * PDF Service
 * Handles PDF text extraction in the main process
 * Uses pdf-parse for reliable text extraction
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

class PDFService {
  constructor() {
    this.cache = new Map(); // Simple in-memory cache for extracted text
    this.maxCacheSize = 10; // Keep last 10 PDFs
  }

  /**
   * Extract text from a PDF file
   * Returns structured data with text content
   */
  async extractText(filePath) {
    try {
      // Validate file path
      if (!this._isValidPath(filePath)) {
        throw new Error('Invalid PDF file path');
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${filePath}`);
      }

      // Check if file is a PDF
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.pdf') {
        throw new Error(`File is not a PDF: ${filePath}`);
      }

      // Check cache first
      if (this.cache.has(filePath)) {
        console.log(`Using cached PDF text for: ${filePath}`);
        return this.cache.get(filePath);
      }

      // Read PDF file
      const pdfBuffer = fs.readFileSync(filePath);

      // Extract text using pdf-parse
      const data = await pdfParse(pdfBuffer);

      // pdf-parse already concatenates all pages into data.text
      const cleanedText = this._cleanText(data.text || '');

      // Store in cache with size management
      this._addToCache(filePath, cleanedText);

      console.log(
        `Extracted text from PDF: ${filePath} (${data.numpages} pages, ${cleanedText.length} chars)`
      );

      return cleanedText;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw error;
    }
  }

  /**
   * Extract metadata from a PDF without full text extraction
   * Faster operation for getting page count, title, etc.
   */
  async getMetadata(filePath) {
    try {
      if (!this._isValidPath(filePath)) {
        throw new Error('Invalid PDF file path');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${filePath}`);
      }

      const pdfBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(pdfBuffer);

      return {
        filePath,
        fileName: path.basename(filePath),
        fileSize: fs.statSync(filePath).size,
        pageCount: data.numpages,
        metadata: data.info || {},
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting PDF metadata:', error);
      throw error;
    }
  }

  /**
   * Extract text from specific pages
   */
  async extractTextFromPages(filePath, pageNumbers) {
    try {
      if (!Array.isArray(pageNumbers) || pageNumbers.length === 0) {
        throw new Error('Invalid page numbers');
      }

      if (!this._isValidPath(filePath)) {
        throw new Error('Invalid PDF file path');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${filePath}`);
      }

      const pdfBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(pdfBuffer);

      // Validate page numbers
      const validPages = pageNumbers.filter((p) => p > 0 && p <= data.numpages);
      if (validPages.length === 0) {
        throw new Error('No valid page numbers provided');
      }

      // For now, return full text (pdf-parse doesn't support per-page extraction easily)
      // A more sophisticated implementation would use pdf.js or similar
      const text = data.version ? data.text : '';
      const cleanedText = this._cleanText(text);

      return {
        filePath,
        pageCount: data.numpages,
        requestedPages: validPages,
        text: cleanedText,
        note: 'Full text returned; pdf-parse returns concatenated text'
      };
    } catch (error) {
      console.error('Error extracting PDF pages:', error);
      throw error;
    }
  }

  /**
   * Clean extracted text by removing artifacts and extra whitespace
   */
  _cleanText(text) {
    if (!text) return '';

    // Remove control characters
    let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Replace multiple newlines with single newline
    cleaned = cleaned.replace(/\n\n+/g, '\n');

    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/  +/g, ' ');

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Validate file path to prevent directory traversal
   */
  _isValidPath(filePath) {
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return false;
    }

    if (!path.isAbsolute(filePath)) {
      return false;
    }

    const normalized = path.normalize(filePath);
    const resolved = path.resolve(filePath);

    if (normalized !== resolved || filePath.includes('..') || normalized.includes('..')) {
      return false;
    }

    return true;
  }

  /**
   * Add text to cache with LRU eviction
   */
  _addToCache(filePath, text) {
    this.cache.set(filePath, text);

    // Remove oldest entry if cache is too large
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    console.log('PDF cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      files: Array.from(this.cache.keys())
    };
  }
}

module.exports = PDFService;

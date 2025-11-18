/**
 * Screenshot Service
 * Handles screenshot capture and resizing for LLM analysis
 */

class ScreenshotService {
  /**
   * Capture page screenshot and resize to max dimension on long edge
   * @param {WebContentsView} view - The view to capture
   * @param {number} maxDimension - Maximum dimension for long edge (default: 512)
   * @returns {Promise<Object>} Screenshot data with base64 and dimensions
   */
  static async captureAndResize(view, maxDimension = 512) {
    if (!view || !view.webContents) {
      throw new Error('Invalid view provided');
    }

    // Capture the visible area of the page
    const image = await view.webContents.capturePage();

    // Get original dimensions
    const size = image.getSize();
    let { width, height } = size;

    // Calculate new dimensions (max dimension on long edge)
    let needsResize = false;

    if (width > maxDimension || height > maxDimension) {
      needsResize = true;
      if (width > height) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }
    }

    // Resize if needed
    const finalImage = needsResize ? image.resize({ width, height }) : image;

    // Convert to PNG and then to base64
    const pngBuffer = finalImage.toPNG();
    const base64Data = pngBuffer.toString('base64');

    return {
      base64: base64Data,
      width,
      height,
      originalWidth: size.width,
      originalHeight: size.height,
      format: 'png'
    };
  }
}

module.exports = ScreenshotService;

/**
 * Tests for ScreenshotService
 */

const ScreenshotService = require('../../src/services/screenshot-service');

describe('ScreenshotService', () => {
  describe('captureAndResize', () => {
    it('should throw error for invalid view', async () => {
      await expect(ScreenshotService.captureAndResize(null))
        .rejects.toThrow('Invalid view provided');
    });

    it('should throw error for view without webContents', async () => {
      const invalidView = {};
      await expect(ScreenshotService.captureAndResize(invalidView))
        .rejects.toThrow('Invalid view provided');
    });

    it('should capture and resize screenshot', async () => {
      // Mock view with webContents
      const mockImage = {
        getSize: () => ({ width: 1024, height: 768 }),
        resize: jest.fn().mockReturnThis(),
        toPNG: () => Buffer.from('fake-png-data')
      };

      const mockView = {
        webContents: {
          capturePage: jest.fn().mockResolvedValue(mockImage)
        }
      };

      const result = await ScreenshotService.captureAndResize(mockView);

      expect(result).toHaveProperty('base64');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('originalWidth', 1024);
      expect(result).toHaveProperty('originalHeight', 768);
      expect(result).toHaveProperty('format', 'png');
      expect(mockView.webContents.capturePage).toHaveBeenCalled();
    });

    it('should resize image if width exceeds max dimension', async () => {
      const mockImage = {
        getSize: () => ({ width: 1024, height: 768 }),
        resize: jest.fn().mockReturnThis(),
        toPNG: () => Buffer.from('fake-png-data')
      };

      const mockView = {
        webContents: {
          capturePage: jest.fn().mockResolvedValue(mockImage)
        }
      };

      const result = await ScreenshotService.captureAndResize(mockView, 512);

      expect(mockImage.resize).toHaveBeenCalledWith({ width: 512, height: 384 });
      expect(result.width).toBe(512);
      expect(result.height).toBe(384);
    });

    it('should not resize if image is smaller than max dimension', async () => {
      const mockImage = {
        getSize: () => ({ width: 400, height: 300 }),
        resize: jest.fn().mockReturnThis(),
        toPNG: () => Buffer.from('fake-png-data')
      };

      const mockView = {
        webContents: {
          capturePage: jest.fn().mockResolvedValue(mockImage)
        }
      };

      const result = await ScreenshotService.captureAndResize(mockView, 512);

      expect(mockImage.resize).not.toHaveBeenCalled();
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
    });
  });
});

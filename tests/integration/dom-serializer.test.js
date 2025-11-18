/**
 * Tests for DOMSerializer
 */

const { serializeDOM, extractMediaElements, resolveURL } = require('../../src/preload/modules/dom-serializer');
const { JSDOM } = require('jsdom');

describe('DOMSerializer', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="Test description">
          <meta property="og:title" content="OG Title">
        </head>
        <body>
          <main>
            <h1>Main Heading</h1>
            <h2>Sub Heading</h2>
            <p>First paragraph</p>
            <p>Second paragraph</p>
            <a href="/test" title="Test Link">Link Text</a>
            <div data-llm-important="custom-data">Custom Element</div>
            <img src="/image.png" alt="Test Image" width="100" height="100">
            <video src="/video.mp4" width="640" height="480"></video>
          </main>
        </body>
      </html>
    `, { url: 'https://example.com' });

    document = dom.window.document;
    window = dom.window;

    // Make globals available to the module
    global.document = document;
    global.window = window;
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
  });

  describe('resolveURL', () => {
    it('should resolve relative URL to absolute', () => {
      const result = resolveURL('/test', 'https://example.com');
      expect(result).toBe('https://example.com/test');
    });

    it('should return original URL if resolution fails', () => {
      const result = resolveURL('invalid', '');
      expect(result).toBe('invalid');
    });
  });

  describe('extractMediaElements', () => {
    it('should extract images with metadata', () => {
      const result = extractMediaElements('https://example.com');

      expect(result.images).toHaveLength(1);
      expect(result.images[0]).toMatchObject({
        src: 'https://example.com/image.png',
        alt: 'Test Image',
        width: 100,
        height: 100
      });
    });

    it('should extract videos with metadata', () => {
      const result = extractMediaElements('https://example.com');

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0]).toMatchObject({
        src: 'https://example.com/video.mp4',
        width: 640,
        height: 480
      });
    });

    it('should return count of media elements', () => {
      const result = extractMediaElements('https://example.com');

      expect(result.count.images).toBe(1);
      expect(result.count.videos).toBe(1);
    });
  });

  describe('serializeDOM', () => {
    it('should serialize basic DOM structure', () => {
      const result = serializeDOM();

      expect(result).toHaveProperty('title', 'Test Page');
      expect(result).toHaveProperty('url', 'https://example.com/');
      expect(result).toHaveProperty('timestamp');
    });

    it('should extract headings', () => {
      const result = serializeDOM();

      expect(result.headings).toHaveLength(2);
      expect(result.headings[0]).toMatchObject({
        level: 'h1',
        text: 'Main Heading'
      });
      expect(result.headings[1]).toMatchObject({
        level: 'h2',
        text: 'Sub Heading'
      });
    });

    it('should extract paragraphs', () => {
      const result = serializeDOM();

      expect(result.paragraphs).toHaveLength(2);
      expect(result.paragraphs[0].text).toBe('First paragraph');
      expect(result.paragraphs[1].text).toBe('Second paragraph');
    });

    it('should extract links', () => {
      const result = serializeDOM();

      expect(result.links).toHaveLength(1);
      expect(result.links[0]).toMatchObject({
        text: 'Link Text',
        href: 'https://example.com/test',
        title: 'Test Link'
      });
    });

    it('should extract custom elements', () => {
      const result = serializeDOM();

      expect(result.customElements).toHaveLength(1);
      expect(result.customElements[0]).toMatchObject({
        tag: 'div',
        content: 'Custom Element',
        attributes: {
          dataLlm: 'custom-data'
        }
      });
    });

    it('should extract main content', () => {
      const result = serializeDOM();

      expect(result.mainContent).toContain('Main Heading');
      expect(result.mainContent).toContain('First paragraph');
    });

    it('should extract meta tags', () => {
      const result = serializeDOM();

      expect(result.metaTags).toHaveProperty('description', 'Test description');
      expect(result.metaTags).toHaveProperty('og:title', 'OG Title');
    });

    it('should include media elements', () => {
      const result = serializeDOM();

      expect(result.media).toBeDefined();
      expect(result.media.images).toHaveLength(1);
      expect(result.media.videos).toHaveLength(1);
    });
  });
});

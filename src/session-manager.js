const { session } = require('electron');

/**
 * Session Manager - Handles persistent session initialization
 */
class SessionManager {
  constructor() {
    this.persistentSession = null;
  }

  /**
   * Initialize a persistent session for localStorage storage
   */
  initialize() {
    // Get or create a persistent session named 'persist'
    this.persistentSession = session.fromPartition('persist:llm-dom-browser', { cache: true });
    console.log('Initialized persistent session for localStorage storage');
    return this.persistentSession;
  }

  /**
   * Get the persistent session instance
   */
  getSession() {
    if (!this.persistentSession) {
      this.initialize();
    }
    return this.persistentSession;
  }
}

module.exports = SessionManager;

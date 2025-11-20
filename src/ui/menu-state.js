/**
 * Menu management - handles collapsing/expanding menu sections
 */
const menuState = {
  isCollapsed: false,

  load() {
    try {
      const collapsed = localStorage.getItem('llm-dom-menu-collapsed');
      return collapsed === 'true';
    } catch (error) {
      console.error('Error loading menu state:', error);
      return false;
    }
  },

  save(collapsed) {
    try {
      localStorage.setItem('llm-dom-menu-collapsed', collapsed.toString());
    } catch (error) {
      console.error('Error saving menu state:', error);
    }
  },

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.apply();
    this.save(this.isCollapsed);
  },

  apply() {
    if (this.isCollapsed) {
      tabsSection.classList.add('collapsed');
      bookmarksSection.classList.add('collapsed');
      inputSection.classList.add('collapsed');
      menuButton.classList.add('active');
      menuButton.title = 'Show menu sections';
    } else {
      tabsSection.classList.remove('collapsed');
      bookmarksSection.classList.remove('collapsed');
      inputSection.classList.remove('collapsed');
      menuButton.classList.remove('active');
      menuButton.title = 'Hide menu sections';
    }
  },

  init() {
    this.isCollapsed = this.load();
    this.apply();
  }
};

/**
 * Bookmarks section collapse management
 */
const bookmarksState = {
  isCollapsed: false,

  load() {
    try {
      const collapsed = localStorage.getItem('llm-dom-bookmarks-collapsed');
      return collapsed === 'true';
    } catch (error) {
      console.error('Error loading bookmarks state:', error);
      return false;
    }
  },

  save(collapsed) {
    try {
      localStorage.setItem('llm-dom-bookmarks-collapsed', collapsed.toString());
    } catch (error) {
      console.error('Error saving bookmarks state:', error);
    }
  },

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.apply();
    this.save(this.isCollapsed);
  },

  apply() {
    if (this.isCollapsed) {
      bookmarksSection.classList.add('bookmarks-collapsed');
    } else {
      bookmarksSection.classList.remove('bookmarks-collapsed');
    }
  },

  init() {
    this.isCollapsed = this.load();
    this.apply();
  }
};

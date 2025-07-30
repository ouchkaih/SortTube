// YouTube Playlist Manager Content Script - Enhanced with LocalStorage
// NOTE: This version uses localStorage which is NOT supported in Claude.ai artifacts
// Copy this code to use in your browser extension or userscript environment

class PlaylistManager {
  constructor() {
    this.isActive = false;
    this.originalOrder = null;
    this.currentSortType = null;
    this.videoEndObserver = null;
    this.storageKey = 'youtube-playlist-manager';
    this.init();
    this.loadSettings();
    this.injectStyles();
  }

  // Load settings and preferences from localStorage
  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const settings = JSON.parse(stored);
        this.settings = {
          autoSave: settings.autoSave !== false, // Default true
          rememberSort: settings.rememberSort !== false, // Default true
          defaultSort: settings.defaultSort || null,
          savedPlaylists: settings.savedPlaylists || {},
          buttonPosition: settings.buttonPosition || { top: '0px', right: '20px' },
          notifications: settings.notifications !== false, // Default true
          theme: settings.theme || 'default'
        };
      } else {
        this.settings = {
          autoSave: true,
          rememberSort: true,
          defaultSort: null,
          savedPlaylists: {},
          buttonPosition: { top: '0px', right: '20px' },
          notifications: true,
          theme: 'default'
        };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = {
        autoSave: true,
        rememberSort: true,
        defaultSort: null,
        savedPlaylists: {},
        buttonPosition: { top: '0px', right: '20px' },
        notifications: true,
        theme: 'default'
      };
    }
  }

  // Save settings to localStorage
  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Get current playlist ID from URL
  getCurrentPlaylistId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('list');
  }

  // Save current playlist state
  savePlaylistState(playlistId, sortType, order) {
    if (!this.settings.autoSave || !playlistId) return;
    
    try {
      this.settings.savedPlaylists[playlistId] = {
        sortType: sortType,
        order: order,
        timestamp: Date.now(),
        url: window.location.href
      };
      this.saveSettings();
      console.log('Playlist state saved for:', playlistId);
    } catch (error) {
      console.error('Error saving playlist state:', error);
    }
  }

  // Load playlist state
  loadPlaylistState(playlistId) {
    if (!this.settings.rememberSort || !playlistId) return null;
    
    try {
      const saved = this.settings.savedPlaylists[playlistId];
      if (saved && saved.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000)) { // Keep for 7 days
        console.log('Loading saved state for playlist:', playlistId, saved.sortType);
        return saved;
      }
    } catch (error) {
      console.error('Error loading playlist state:', error);
    }
    return null;
  }

  // Add CSS styles for the floating button and popup
  injectStyles() {
    if (document.getElementById('playlist-manager-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'playlist-manager-styles';
    styles.textContent = `
      #playlist-manager-controls {
        position: fixed;
        top: ${this.settings.buttonPosition.top};
        right: ${this.settings.buttonPosition.right};
        z-index: 10000;
        font-family: 'Roboto', Arial, sans-serif;
      }

      .floating-btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: ${this.settings.theme === 'dark' ? 
          'linear-gradient(135deg, #333, #555)' : 
          'linear-gradient(135deg, #ff6b6b, #ff8e8e)'};
        border: none;
        cursor: pointer;
        font-size: 20px;
        color: white;
        box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .floating-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.6);
      }

      .floating-btn.has-saved-state::after {
        content: '';
        position: absolute;
        top: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        background: #4caf50;
        border-radius: 50%;
        border: 2px solid white;
      }

      .options-popup {
        position: absolute;
        top: 60px;
        right: 0;
        width: 320px;
        background: ${this.settings.theme === 'dark' ? '#1a1a1a' : '#1f1f1f'};
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        transition: all 0.3s ease;
        border: 1px solid #333;
        max-height: 600px;
        overflow-y: auto;
      }

      .options-popup.hidden {
        opacity: 0;
        transform: translateY(-10px);
        pointer-events: none;
      }

      .popup-header {
        background: ${this.settings.theme === 'dark' ? 
          'linear-gradient(135deg, #333, #555)' : 
          'linear-gradient(135deg, #ff6b6b, #ff8e8e)'};
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .popup-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }

      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s ease;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .popup-content {
        padding: 10px 0;
      }

      .popup-section {
        border-bottom: 1px solid #333;
        margin-bottom: 10px;
        padding-bottom: 10px;
      }

      .popup-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .section-title {
        color: #999;
        font-size: 12px;
        text-transform: uppercase;
        padding: 0 20px 8px;
        margin: 0;
        font-weight: 500;
      }

      .option-btn {
        width: 100%;
        padding: 12px 20px;
        background: none;
        border: none;
        color: #e0e0e0;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: background 0.2s ease;
        font-size: 14px;
        text-align: left;
      }

      .option-btn:hover {
        background: #333;
      }

      .option-btn.active {
        background: #2a4d3a;
        color: #4caf50;
      }

      .option-btn .icon {
        font-size: 16px;
        width: 20px;
        display: flex;
        justify-content: center;
      }

      .option-btn .label {
        flex: 1;
        text-align: left;
      }

      .option-btn .status {
        font-size: 11px;
        color: #999;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 10px;
      }

      .reset-btn {
        color: #ff9999;
      }

      .reset-btn:hover {
        background: #2a1a1a;
      }

      .settings-toggle {
        background: #444;
        border: none;
        color: white;
        padding: 8px 20px;
        width: 100%;
        cursor: pointer;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .settings-toggle:hover {
        background: #555;
      }

      .settings-panel {
        background: #222;
        padding: 15px 20px;
        display: none;
      }

      .settings-panel.visible {
        display: block;
      }

      .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        color: #ccc;
        font-size: 13px;
      }

      .setting-item:last-child {
        margin-bottom: 0;
      }

      .setting-checkbox {
        width: 16px;
        height: 16px;
        accent-color: #ff6b6b;
      }

      .playlist-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10001;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
        max-width: 300px;
      }

      .playlist-notification.error {
        background: #f44336;
      }

      .playlist-notification.info {
        background: #2196f3;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .saved-playlists {
        max-height: 150px;
        overflow-y: auto;
      }

      .saved-playlist-item {
        padding: 8px 20px;
        border-bottom: 1px solid #333;
        font-size: 12px;
        color: #aaa;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .saved-playlist-item:hover {
        background: #333;
      }

      .playlist-info {
        flex: 1;
      }

      .playlist-sort {
        color: #4caf50;
        font-size: 10px;
        text-transform: uppercase;
      }

      .delete-saved {
        background: none;
        border: none;
        color: #ff6b6b;
        cursor: pointer;
        padding: 2px 4px;
        font-size: 12px;
      }

      .auto-sort-indicator {
        position: absolute;
        top: -3px;
        left: -3px;
        width: 16px;
        height: 16px;
        background: #4caf50;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }

  init() {
    // Wait for page to load and check if we're on a playlist page
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.checkAndInject());
    } else {
      this.checkAndInject();
    }

    // Listen for URL changes (YouTube is a SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        // Longer delay for video pages to ensure side playlist loads
        const delay = url.includes('watch?') ? 2000 : 1000;
        setTimeout(() => this.checkAndInject(), delay);
      }
    }).observe(document, { subtree: true, childList: true });

    // Additional observer specifically for side playlist loading
    const sidePlaylistObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if a playlist panel was added
            if (node.matches && (
                node.matches('ytd-playlist-panel-renderer') ||
                node.querySelector && node.querySelector('ytd-playlist-panel-renderer')
              )) {
              console.log('Side playlist detected, injecting controls...');
              setTimeout(() => this.checkAndInject(), 500);
            }
          }
        });
      });
    });

    sidePlaylistObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkAndInject() {
    // Check if we're on a playlist page OR watching a video from a playlist
    const isPlaylistPage = window.location.href.includes('playlist?list=') || 
                          document.querySelector('#playlist-items');
    const isVideoWithPlaylist = window.location.href.includes('watch?') && 
                               window.location.href.includes('list=');
    
    // Check for side playlist elements - specifically look for ytd-playlist-panel-renderer
    const hasSidePlaylist = document.querySelector('ytd-playlist-panel-renderer#playlist') ||
                           document.querySelector('ytd-playlist-panel-renderer') ||
                           document.querySelector('.ytd-playlist-panel-renderer');
    
    const shouldBeActive = isPlaylistPage || (isVideoWithPlaylist && hasSidePlaylist);
    
    console.log('Checking injection conditions:', {
      isPlaylistPage,
      isVideoWithPlaylist,
      hasSidePlaylist,
      shouldBeActive,
      currentUrl: window.location.href
    });
    
    if (shouldBeActive && !this.isActive) {
      // Add a small delay to ensure DOM is ready for side playlists
      setTimeout(() => {
        const items = this.getPlaylistItems();
        if (items.length > 0) {
          this.injectControls();
          this.isActive = true;
          console.log('Controls injected successfully');
          
          // Auto-apply saved sort if enabled
          this.autoApplySavedSort();
        } else {
          console.log('No playlist items found, retrying in 1 second...');
          setTimeout(() => this.checkAndInject(), 1000);
        }
      }, isVideoWithPlaylist ? 1500 : 100);
    } else if (!shouldBeActive && this.isActive) {
      this.removeControls();
      this.isActive = false;
      console.log('Controls removed');
    }
  }

  // Auto-apply saved sort for current playlist
  autoApplySavedSort() {
    const playlistId = this.getCurrentPlaylistId();
    if (!playlistId) return;
    
    const savedState = this.loadPlaylistState(playlistId);
    if (savedState && savedState.sortType && this.settings.rememberSort) {
      setTimeout(() => {
        this.applySortType(savedState.sortType, true); // true = silent
        this.currentSortType = savedState.sortType;
        this.updateButtonIndicator();
        if (this.settings.notifications) {
          this.showNotification(`Auto-applied ${savedState.sortType} sort 🔄`, 'info');
        }
      }, 1000);
    }
  }

  // Apply a specific sort type
  applySortType(sortType, silent = false) {
    switch (sortType) {
      case 'reverse':
        silent ? this.reversePlaylistSilent() : this.reversePlaylist();
        break;
      case 'shuffle':
        silent ? this.shufflePlaylistSilent() : this.shufflePlaylist();
        break;
      case 'alphabetical':
        silent ? this.sortAlphabeticalSilent() : this.sortAlphabetical();
        break;
      case 'duration':
        silent ? this.sortByDurationSilent() : this.sortByDuration();
        break;
      case 'upload-date':
        silent ? this.sortByUploadDateSilent() : this.sortByUploadDate();
        break;
    }
  }

  injectControls() {
    // Remove existing controls first
    this.removeControls();

    // Debug: Log current page info
    console.log('Injecting controls. Current URL:', window.location.href);
    console.log('Playlist items found:', this.getPlaylistItems().length);

    const playlistId = this.getCurrentPlaylistId();
    const savedState = this.loadPlaylistState(playlistId);
    const hasSavedState = savedState && savedState.sortType;

    // Create floating button with enhanced options
    const floatingButton = document.createElement('div');
    floatingButton.id = 'playlist-manager-controls';
    floatingButton.innerHTML = `
      <button id="playlist-manager-toggle" class="floating-btn ${hasSavedState ? 'has-saved-state' : ''}" title="Playlist Manager">
        🎵
      </button>
      <div id="playlist-options-popup" class="options-popup hidden">
        <div class="popup-header">
          <h3>🎵 Playlist Manager</h3>
          <button id="close-popup" class="close-btn">×</button>
        </div>
        <div class="popup-content">
          <div class="popup-section">
            <h4 class="section-title">Sort Options</h4>
            <button id="reverse-playlist" class="option-btn ${this.currentSortType === 'reverse' ? 'active' : ''}">
              <span class="icon">↕️</span>
              <span class="label">Reverse Order</span>
              ${this.currentSortType === 'reverse' ? '<span class="status">Active</span>' : ''}
            </button>
            <button id="shuffle-playlist" class="option-btn ${this.currentSortType === 'shuffle' ? 'active' : ''}">
              <span class="icon">🔀</span>
              <span class="label">Shuffle</span>
              ${this.currentSortType === 'shuffle' ? '<span class="status">Active</span>' : ''}
            </button>
            <button id="sort-alphabetical" class="option-btn ${this.currentSortType === 'alphabetical' ? 'active' : ''}">
              <span class="icon">🔤</span>
              <span class="label">Sort A-Z</span>
              ${this.currentSortType === 'alphabetical' ? '<span class="status">Active</span>' : ''}
            </button>
            <button id="sort-duration" class="option-btn ${this.currentSortType === 'duration' ? 'active' : ''}">
              <span class="icon">⏱️</span>
              <span class="label">Sort by Duration</span>
              ${this.currentSortType === 'duration' ? '<span class="status">Active</span>' : ''}
            </button>
            <button id="sort-upload-date" class="option-btn ${this.currentSortType === 'upload-date' ? 'active' : ''}">
              <span class="icon">📅</span>
              <span class="label">Sort by Upload Date</span>
              ${this.currentSortType === 'upload-date' ? '<span class="status">Active</span>' : ''}
            </button>
          </div>
          
          <div class="popup-section">
            <h4 class="section-title">Actions</h4>
            <button id="reset-playlist" class="option-btn reset-btn">
              <span class="icon">🔄</span>
              <span class="label">Reset Original</span>
            </button>
            <button id="save-current-sort" class="option-btn">
              <span class="icon">💾</span>
              <span class="label">Save Current Sort</span>
            </button>
          </div>

          ${Object.keys(this.settings.savedPlaylists).length > 0 ? `
          <div class="popup-section">
            <h4 class="section-title">Saved Playlists (${Object.keys(this.settings.savedPlaylists).length})</h4>
            <div class="saved-playlists">
              ${this.renderSavedPlaylists()}
            </div>
            <button id="clear-all-saved" class="option-btn" style="color: #ff6b6b;">
              <span class="icon">🗑️</span>
              <span class="label">Clear All Saved</span>
            </button>
          </div>
          ` : ''}

          <button class="settings-toggle" id="settings-toggle">⚙️ Settings</button>
          <div id="settings-panel" class="settings-panel">
            <div class="setting-item">
              <label>Auto-save sort preferences</label>
              <input type="checkbox" id="auto-save-toggle" class="setting-checkbox" ${this.settings.autoSave ? 'checked' : ''}>
            </div>
            <div class="setting-item">
              <label>Remember sort on reload</label>
              <input type="checkbox" id="remember-sort-toggle" class="setting-checkbox" ${this.settings.rememberSort ? 'checked' : ''}>
            </div>
            <div class="setting-item">
              <label>Show notifications</label>
              <input type="checkbox" id="notifications-toggle" class="setting-checkbox" ${this.settings.notifications ? 'checked' : ''}>
            </div>
            <div class="setting-item">
              <label>Dark theme</label>
              <input type="checkbox" id="theme-toggle" class="setting-checkbox" ${this.settings.theme === 'dark' ? 'checked' : ''}>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inject directly into body for fixed positioning
    document.body.appendChild(floatingButton);
    this.attachEventListeners();
    this.saveOriginalOrder();
    this.setupAutoplayHandling();
  }

  renderSavedPlaylists() {
    return Object.entries(this.settings.savedPlaylists)
      .sort(([,a], [,b]) => b.timestamp - a.timestamp)
      .slice(0, 5) // Show last 5
      .map(([id, data]) => `
        <div class="saved-playlist-item">
          <div class="playlist-info">
            <div style="font-size: 11px; margin-bottom: 2px;">
              ${id.substring(0, 20)}${id.length > 20 ? '...' : ''}
            </div>
            <div class="playlist-sort">${data.sortType}</div>
          </div>
          <button class="delete-saved" data-playlist-id="${id}">×</button>
        </div>
      `).join('');
  }

  removeControls() {
    const existing = document.getElementById('playlist-manager-controls');
    if (existing) {
      existing.remove();
    }
    this.cleanupAutoplayHandling();
  }

  attachEventListeners() {
    // Toggle popup
    document.getElementById('playlist-manager-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePopup();
    });

    // Close popup
    document.getElementById('close-popup')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hidePopup();
    });

    // Sort action buttons
    document.getElementById('reverse-playlist')?.addEventListener('click', () => {
      this.reversePlaylist();
      this.hidePopup();
    });
    document.getElementById('shuffle-playlist')?.addEventListener('click', () => {
      this.shufflePlaylist();
      this.hidePopup();
    });
    document.getElementById('sort-alphabetical')?.addEventListener('click', () => {
      this.sortAlphabetical();
      this.hidePopup();
    });
    document.getElementById('sort-duration')?.addEventListener('click', () => {
      this.sortByDuration();
      this.hidePopup();
    });
    document.getElementById('sort-upload-date')?.addEventListener('click', () => {
      this.sortByUploadDate();
      this.hidePopup();
    });
    document.getElementById('reset-playlist')?.addEventListener('click', () => {
      this.resetPlaylist();
      this.hidePopup();
    });

    // New buttons
    document.getElementById('save-current-sort')?.addEventListener('click', () => {
      this.saveCurrentSort();
      this.hidePopup();
    });

    document.getElementById('clear-all-saved')?.addEventListener('click', () => {
      this.clearAllSaved();
      this.hidePopup();
    });

    // Settings toggle
    document.getElementById('settings-toggle')?.addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.classList.toggle('visible');
    });

    // Settings checkboxes
    document.getElementById('auto-save-toggle')?.addEventListener('change', (e) => {
      this.settings.autoSave = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('remember-sort-toggle')?.addEventListener('change', (e) => {
      this.settings.rememberSort = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('notifications-toggle')?.addEventListener('change', (e) => {
      this.settings.notifications = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('theme-toggle')?.addEventListener('change', (e) => {
      this.settings.theme = e.target.checked ? 'dark' : 'default';
      this.saveSettings();
      // Reload styles
      document.getElementById('playlist-manager-styles')?.remove();
      this.injectStyles();
      // Reload controls to apply new theme
      setTimeout(() => {
        this.removeControls();
        this.injectControls();
      }, 100);
    });

    // Delete saved playlist buttons
    document.querySelectorAll('.delete-saved').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const playlistId = btn.dataset.playlistId;
        this.deleteSavedPlaylist(playlistId);
      });
    });

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('playlist-options-popup');
      const button = document.getElementById('playlist-manager-toggle');
      if (popup && !popup.contains(e.target) && !button.contains(e.target)) {
        this.hidePopup();
      }
    });

    // Close popup on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hidePopup();
      }
    });
  }

  saveCurrentSort() {
    const playlistId = this.getCurrentPlaylistId();
    if (!playlistId) {
      this.showNotification('No playlist ID found!', 'error');
      return;
    }

    if (!this.currentSortType) {
      this.showNotification('No sort applied to save!', 'error');
      return;
    }

    const items = this.getPlaylistItems();
    const order = items.map((item, index) => ({
      index,
      title: this.getVideoTitle(item)
    }));

    this.savePlaylistState(playlistId, this.currentSortType, order);
    this.showNotification(`Saved ${this.currentSortType} sort for this playlist! 💾`);
  }

  clearAllSaved() {
    this.settings.savedPlaylists = {};
    this.saveSettings();
    this.showNotification('All saved playlists cleared! 🗑️');
    // Refresh the popup
    setTimeout(() => {
      this.removeControls();
      this.injectControls();
    }, 500);
  }

  deleteSavedPlaylist(playlistId) {
    delete this.settings.savedPlaylists[playlistId];
    this.saveSettings();
    this.showNotification('Saved playlist removed! 🗑️');
    // Refresh the popup
    setTimeout(() => {
      this.removeControls();
      this.injectControls();
    }, 500);
  }

  updateButtonIndicator() {
    const button = document.getElementById('playlist-manager-toggle');
    if (button) {
      if (this.currentSortType) {
        if (!button.querySelector('.auto-sort-indicator')) {
          button.innerHTML += '<div class="auto-sort-indicator">✓</div>';
        }
      } else {
        const indicator = button.querySelector('.auto-sort-indicator');
        if (indicator) {
          indicator.remove();
        }
      }
    }
  }

  togglePopup() {
    const popup = document.getElementById('playlist-options-popup');
    if (popup) {
      popup.classList.toggle('hidden');
    }
  }

  hidePopup() {
    const popup = document.getElementById('playlist-options-popup');
    if (popup) {
      popup.classList.add('hidden');
    }
  }

  getPlaylistItems() {
    // Enhanced selectors with better specificity
    const selectors = [
      // Main playlist page selectors
      'ytd-playlist-video-renderer',
      '.ytd-playlist-video-renderer',
      '#playlist-items ytd-playlist-video-renderer',
      '.playlist-items ytd-playlist-video-renderer',
      // Side playlist selectors (specific to ytd-playlist-panel-renderer structure)
      'ytd-playlist-panel-renderer#playlist ytd-playlist-video-renderer',
      'ytd-playlist-panel-renderer ytd-playlist-video-renderer',
      '#playlist.ytd-playlist-panel-renderer ytd-playlist-video-renderer',
      'ytd-playlist-panel-renderer #container ytd-playlist-video-renderer',
      'ytd-playlist-panel-renderer ytd-playlist-video-list-renderer ytd-playlist-video-renderer',
      // More specific side playlist selectors
      '.ytd-watch-flexy ytd-playlist-panel-renderer ytd-playlist-video-renderer',
      '[id="playlist"][class*="ytd-playlist-panel-renderer"] ytd-playlist-video-renderer',
      // Fallback selectors
      '.ytd-playlist-panel-renderer ytd-playlist-video-renderer',
      '#secondary .ytd-playlist-video-renderer',
      // New enhanced selectors for newer YouTube layouts
      'ytd-playlist-panel-renderer ytd-playlist-panel-video-renderer',
      '#playlist ytd-playlist-panel-video-renderer'
    ];

    for (const selector of selectors) {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        console.log(`Found ${items.length} playlist items with selector: ${selector}`);
        return Array.from(items).filter(item => item.offsetParent !== null); // Filter out hidden items
      }
    }
    
    // Debug: Log available elements if nothing found
    console.log('No playlist items found. Available elements:');
    console.log('Playlist panel:', document.querySelector('ytd-playlist-panel-renderer'));
    console.log('Playlist panel with id:', document.querySelector('ytd-playlist-panel-renderer#playlist'));
    console.log('Container in playlist panel:', document.querySelector('ytd-playlist-panel-renderer #container'));
    console.log('All ytd-playlist-video-renderer:', document.querySelectorAll('ytd-playlist-video-renderer'));
    
    return [];
  }

  saveOriginalOrder() {
    if (!this.originalOrder) {
      const items = this.getPlaylistItems();
      this.originalOrder = items.map(item => ({
        element: item.cloneNode(true),
        originalIndex: Array.from(item.parentNode.children).indexOf(item)
      }));
      console.log('Original order saved:', this.originalOrder.length, 'items');
    }
  }

  // Enhanced sorting methods with localStorage integration
  reversePlaylist() {
    const items = this.getPlaylistItems();
    if (items.length === 0) {
      this.showNotification('No playlist items found!', 'error');
      return;
    }

    const container = items[0].parentNode;
    console.log('Reversing playlist with', items.length, 'items');
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Reverse the array and append to fragment
    const reversedItems = [...items].reverse();
    reversedItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    
    // Append all items at once
    container.appendChild(fragment);
    
    this.currentSortType = 'reverse';
    this.updateButtonIndicator();
    this.autoSavePlaylistState();
    this.showNotification('Playlist reversed! 🔄');
  }

  shufflePlaylist() {
    const items = this.getPlaylistItems();
    if (items.length === 0) {
      this.showNotification('No playlist items found!', 'error');
      return;
    }

    const container = items[0].parentNode;
    console.log('Shuffling playlist with', items.length, 'items');
    
    // Fisher-Yates shuffle
    const shuffledItems = [...items];
    for (let i = shuffledItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
    }
    
    // Create fragment and append shuffled items
    const fragment = document.createDocumentFragment();
    shuffledItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
    
    this.currentSortType = 'shuffle';
    this.updateButtonIndicator();
    this.autoSavePlaylistState();
    this.showNotification('Playlist shuffled! 🔀');
  }

  sortAlphabetical() {
    const items = this.getPlaylistItems();
    if (items.length === 0) {
      this.showNotification('No playlist items found!', 'error');
      return;
    }

    const container = items[0].parentNode;
    console.log('Sorting alphabetically with', items.length, 'items');
    
    // Sort by title
    const sortedItems = [...items].sort((a, b) => {
      const titleA = this.getVideoTitle(a);
      const titleB = this.getVideoTitle(b);
      console.log('Comparing:', titleA, 'vs', titleB);
      return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
    });
    
    // Create fragment and append sorted items
    const fragment = document.createDocumentFragment();
    sortedItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
    
    this.currentSortType = 'alphabetical';
    this.updateButtonIndicator();
    this.autoSavePlaylistState();
    this.showNotification('Playlist sorted alphabetically! 🔤');
  }

  sortByDuration() {
    const items = this.getPlaylistItems();
    if (items.length === 0) {
      this.showNotification('No playlist items found!', 'error');
      return;
    }

    const container = items[0].parentNode;
    console.log('Sorting by duration with', items.length, 'items');
    
    // Sort by duration
    const sortedItems = [...items].sort((a, b) => {
      const durationA = this.getVideoDuration(a);
      const durationB = this.getVideoDuration(b);
      console.log('Duration comparison:', durationA, 'vs', durationB);
      return durationA - durationB;
    });
    
    // Create fragment and append sorted items
    const fragment = document.createDocumentFragment();
    sortedItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
    
    this.currentSortType = 'duration';
    this.updateButtonIndicator();
    this.autoSavePlaylistState();
    this.showNotification('Playlist sorted by duration! ⏱️');
  }

  sortByUploadDate() {
    const items = this.getPlaylistItems();
    if (items.length === 0) {
      this.showNotification('No playlist items found!', 'error');
      return;
    }

    const container = items[0].parentNode;
    console.log('Sorting by upload date with', items.length, 'items');
    
    // Sort by upload date (newest first)
    const sortedItems = [...items].sort((a, b) => {
      const dateA = this.parseUploadDate(this.getUploadDateText(a));
      const dateB = this.parseUploadDate(this.getUploadDateText(b));
      return dateB - dateA; // Newest first
    });
    
    // Create fragment and append sorted items
    const fragment = document.createDocumentFragment();
    sortedItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
    
    this.currentSortType = 'upload-date';
    this.updateButtonIndicator();
    this.autoSavePlaylistState();
    this.showNotification('Playlist sorted by upload date! 📅');
  }

  // Auto-save playlist state if enabled
  autoSavePlaylistState() {
    if (!this.settings.autoSave) return;
    
    const playlistId = this.getCurrentPlaylistId();
    if (!playlistId || !this.currentSortType) return;
    
    const items = this.getPlaylistItems();
    const order = items.map((item, index) => ({
      index,
      title: this.getVideoTitle(item)
    }));
    
    this.savePlaylistState(playlistId, this.currentSortType, order);
  }

  resetPlaylist() {
    if (!this.originalOrder || this.originalOrder.length === 0) {
      this.showNotification('No original order saved!', 'error');
      return;
    }

    const items = this.getPlaylistItems();
    if (items.length === 0) {
      this.showNotification('No playlist items found!', 'error');
      return;
    }

    const container = items[0].parentNode;
    console.log('Resetting playlist to original order');
    
    // Remove current items
    items.forEach(item => item.remove());
    
    // Create fragment and add original items back
    const fragment = document.createDocumentFragment();
    this.originalOrder
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .forEach(item => {
        fragment.appendChild(item.element.cloneNode(true));
      });
    container.appendChild(fragment);
    
    this.currentSortType = null;
    this.updateButtonIndicator();
    
    // Remove from saved state if auto-save is enabled
    if (this.settings.autoSave) {
      const playlistId = this.getCurrentPlaylistId();
      if (playlistId && this.settings.savedPlaylists[playlistId]) {
        delete this.settings.savedPlaylists[playlistId];
        this.saveSettings();
      }
    }
    
    this.showNotification('Playlist restored to original order! 🔄');
  }

  // Helper methods for extracting video information
  getVideoTitle(item) {
    const titleSelectors = [
      // Main playlist selectors
      '#video-title',
      '.ytd-playlist-video-renderer #video-title',
      'a[id="video-title"]',
      '[id="video-title"] span',
      '[id="video-title"] yt-formatted-string',
      // Side playlist selectors (ytd-playlist-panel-renderer)
      '.ytd-playlist-panel-video-renderer #video-title',
      'ytd-playlist-panel-renderer #video-title',
      '.ytd-playlist-panel-video-renderer a[href*="watch"]',
      'ytd-playlist-panel-video-renderer #video-title',
      // Generic fallbacks
      'h3 a', 
      '.video-title',
      'a[href*="watch"] span',
      '[class*="title"] a',
      // New selectors for updated YouTube layout
      'yt-formatted-string[title]',
      'span[title]'
    ];

    for (const selector of titleSelectors) {
      const element = item.querySelector(selector);
      if (element) {
        // Try getting title from title attribute first
        if (element.title && element.title.trim().length > 0) {
          return element.title.trim();
        }
        // Then try text content
        if (element.textContent && element.textContent.trim().length > 0) {
          return element.textContent.trim();
        }
      }
    }
    
    // Additional fallback: look for any link with watch in href
    const links = item.querySelectorAll('a[href*="watch"]');
    for (const link of links) {
      if (link.title && link.title.trim().length > 0) {
        return link.title.trim();
      }
      if (link.textContent && link.textContent.trim().length > 0) {
        return link.textContent.trim();
      }
    }
    
    console.log('Could not find title for item:', item);
    return 'Unknown Title';
  }

  getVideoDuration(item) {
    const durationSelectors = [
      '.ytd-thumbnail-overlay-time-status-renderer',
      '.ytd-playlist-video-renderer .ytd-thumbnail-overlay-time-status-renderer',
      '.ytd-playlist-panel-video-renderer .ytd-thumbnail-overlay-time-status-renderer',
      'ytd-playlist-panel-renderer .ytd-thumbnail-overlay-time-status-renderer',
      '[class*="duration"]',
      '[class*="time-status"]',
      '.video-duration',
      // Additional selectors
      'span.ytd-thumbnail-overlay-time-status-renderer',
      '#text.ytd-thumbnail-overlay-time-status-renderer'
    ];

    for (const selector of durationSelectors) {
      const element = item.querySelector(selector);
      if (element && element.textContent && element.textContent.trim()) {
        const duration = this.parseDuration(element.textContent.trim());
        if (duration > 0) {
          return duration;
        }
      }
    }
    console.log('Could not find duration for item:', item);
    return 0;
  }

  getUploadDateText(item) {
    // Enhanced selectors for upload date
    const selectors = [
      // Main playlist page selectors
      '.ytd-video-meta-block .style-scope.ytd-video-meta-block:last-child',
      '.ytd-video-meta-block [id="metadata-line"]:last-child',
      '#metadata-line span:last-child',
      '.metadata-line span:last-child',
      '[id="video-info"] .style-scope:last-child',
      '.ytd-playlist-video-renderer #metadata-line span:last-child',
      // Side playlist selectors
      '.ytd-playlist-panel-video-renderer #metadata-line span:last-child',
      '.ytd-playlist-panel-video-renderer .ytd-video-meta-block span:last-child',
      'ytd-playlist-panel-renderer #metadata-line span:last-child',
      'ytd-playlist-panel-video-renderer #metadata-line span:last-child',
      // More generic selectors for side playlist
      '.ytd-playlist-panel-video-renderer [class*="metadata"] span:last-child',
      '#secondary .ytd-playlist-video-renderer #metadata span:last-child',
      // New selectors
      'ytd-playlist-panel-video-renderer .ytd-video-meta-block span:nth-child(2)',
      'ytd-playlist-panel-video-renderer #metadata span:nth-child(2)'
    ];

    for (const selector of selectors) {
      const element = item.querySelector(selector);
      if (element && element.textContent) {
        const text = element.textContent.trim();
        // Check if it looks like a date (contains ago, years, months, etc.)
        if (this.isDateText(text)) {
          return text;
        }
      }
    }

    // Fallback: look for any text that contains date indicators
    const allSpans = item.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.textContent.trim();
      if (this.isDateText(text)) {
        return text;
      }
    }

    console.log('Could not find upload date for item:', item);
    return 'Unknown date';
  }

  isDateText(text) {
    const dateIndicators = [
      'ago', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year',
      'yesterday', 'today', 'streamed', 'premiered'
    ];
    const lowerText = text.toLowerCase();
    return dateIndicators.some(indicator => lowerText.includes(indicator));
  }

  parseUploadDate(dateText) {
    if (!dateText || dateText === 'Unknown date') {
      return new Date(0); // Very old date for unknown items
    }

    const now = new Date();
    const text = dateText.toLowerCase().trim();

    // Handle "Streamed" or "Premiered" dates
    if (text.includes('streamed') || text.includes('premiered')) {
      // Extract the relative time part after "streamed" or "premiered"
      const match = text.match(/(streamed|premiered)\s+(.+)/);
      if (match) {
        return this.parseRelativeDate(match[2], now);
      }
    }

    return this.parseRelativeDate(text, now);
  }

  parseRelativeDate(text, now) {
    // Handle various date formats
    if (text.includes('just now') || text.includes('now')) {
      return now;
    }

    // Extract number and unit
    const match = text.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
    if (!match) {
      // Try to handle other formats
      if (text.includes('yesterday')) {
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      if (text.includes('today')) {
        return now;
      }
      // Default to very old date for unparseable dates
      return new Date(0);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      'second': 1000,
      'minute': 60 * 1000,
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000,
      'month': 30 * 24 * 60 * 60 * 1000, // Approximate
      'year': 365 * 24 * 60 * 60 * 1000 // Approximate
    };

    const milliseconds = value * (multipliers[unit] || 0);
    return new Date(now.getTime() - milliseconds);
  }

  parseDuration(durationText) {
    if (!durationText) return 0;
    
    // Remove any non-digit and non-colon characters
    const cleanText = durationText.replace(/[^\d:]/g, '');
    const parts = cleanText.split(':').map(Number).filter(n => !isNaN(n));
    
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // minutes:seconds
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hours:minutes:seconds
    }
    return 0;
  }

  showNotification(message, type = 'success') {
    if (!this.settings.notifications) return;
    
    // Remove existing notification
    const existing = document.getElementById('playlist-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'playlist-notification';
    notification.className = `playlist-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  setupAutoplayHandling() {
    // Clean up any existing observer
    this.cleanupAutoplayHandling();

    // Only set up autoplay handling when watching a video with playlist
    if (!window.location.href.includes('watch?') || !window.location.href.includes('list=')) {
      return;
    }

    // Monitor video player for ended events
    const video = document.querySelector('video');
    if (video) {
      video.addEventListener('ended', () => this.handleVideoEnd());
    }

    // Also monitor for YouTube's internal navigation events
    this.videoEndObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check if the URL changed (video changed)
        if (window.location.href !== this.lastUrl) {
          this.lastUrl = window.location.href;
          // Small delay to let YouTube update the playlist
          setTimeout(() => this.maintainSortOrder(), 500);
        }
      });
    });

    this.videoEndObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  cleanupAutoplayHandling() {
    if (this.videoEndObserver) {
      this.videoEndObserver.disconnect();
      this.videoEndObserver = null;
    }
  }

  handleVideoEnd() {
    // When video ends, maintain the custom sort order for autoplay
    if (this.currentSortType) {
      setTimeout(() => this.maintainSortOrder(), 1000);
    }
  }

  maintainSortOrder() {
    // Re-apply the current sort if one is active
    if (!this.currentSortType) return;

    switch (this.currentSortType) {
      case 'reverse':
        this.reversePlaylistSilent();
        break;
      case 'shuffle':
        // Don't re-shuffle, keep current order
        break;
      case 'alphabetical':
        this.sortAlphabeticalSilent();
        break;
      case 'duration':
        this.sortByDurationSilent();
        break;
      case 'upload-date':
        this.sortByUploadDateSilent();
        break;
    }
  }

  // Silent versions that don't show notifications (for maintaining order)
  reversePlaylistSilent() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;
    const container = items[0].parentNode;
    const fragment = document.createDocumentFragment();
    const reversedItems = [...items].reverse();
    reversedItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
  }

  sortAlphabeticalSilent() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;
    const container = items[0].parentNode;
    const sortedItems = [...items].sort((a, b) => {
      const titleA = this.getVideoTitle(a);
      const titleB = this.getVideoTitle(b);
      return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
    });
    const fragment = document.createDocumentFragment();
    sortedItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
  }

  sortByDurationSilent() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;
    const container = items[0].parentNode;
    const sortedItems = [...items].sort((a, b) => {
      const durationA = this.getVideoDuration(a);
      const durationB = this.getVideoDuration(b);
      return durationA - durationB;
    });
    const fragment = document.createDocumentFragment();
    sortedItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
  }

  sortByUploadDateSilent() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;
    const container = items[0].parentNode;
    const sortedItems = [...items].sort((a, b) => {
      const dateA = this.parseUploadDate(this.getUploadDateText(a));
      const dateB = this.parseUploadDate(this.getUploadDateText(b));
      return dateB - dateA;
    });
    const fragment = document.createDocumentFragment();
    sortedItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
  }

  shufflePlaylistSilent() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;
    const container = items[0].parentNode;
    
    // Fisher-Yates shuffle
    const shuffledItems = [...items];
    for (let i = shuffledItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
    }
    
    const fragment = document.createDocumentFragment();
    shuffledItems.forEach(item => {
      item.remove();
      fragment.appendChild(item);
    });
    container.appendChild(fragment);
  }
}

// Initialize the playlist manager
new PlaylistManager();
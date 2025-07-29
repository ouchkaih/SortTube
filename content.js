// YouTube Playlist Manager Content Script
class PlaylistManager {
  constructor() {
    this.isActive = false;
    this.originalOrder = null;
    this.currentSortType = null;
    this.videoEndObserver = null;
    this.init();
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

  injectControls() {
    // Remove existing controls first
    this.removeControls();

    // Debug: Log current page info
    console.log('Injecting controls. Current URL:', window.location.href);
    console.log('Playlist items found:', this.getPlaylistItems().length);

    // Create floating button
    const floatingButton = document.createElement('div');
    floatingButton.id = 'playlist-manager-controls';
    floatingButton.innerHTML = `
      <button id="playlist-manager-toggle" class="floating-btn" title="Playlist Manager">
        🎵
      </button>
      <div id="playlist-options-popup" class="options-popup hidden">
        <div class="popup-header">
          <h3>🎵 Playlist Manager</h3>
          <button id="close-popup" class="close-btn">×</button>
        </div>
        <div class="popup-content">
          <button id="reverse-playlist" class="option-btn">
            <span class="icon">↕️</span>
            <span class="label">Reverse Order</span>
          </button>
          <button id="shuffle-playlist" class="option-btn">
            <span class="icon">🔀</span>
            <span class="label">Shuffle</span>
          </button>
          <button id="sort-alphabetical" class="option-btn">
            <span class="icon">🔤</span>
            <span class="label">Sort A-Z</span>
          </button>
          <button id="sort-duration" class="option-btn">
            <span class="icon">⏱️</span>
            <span class="label">Sort by Duration</span>
          </button>
          <button id="sort-upload-date" class="option-btn">
            <span class="icon">📅</span>
            <span class="label">Sort by Upload Date</span>
          </button>
          <button id="reset-playlist" class="option-btn reset-btn">
            <span class="icon">🔄</span>
            <span class="label">Reset Original</span>
          </button>
        </div>
      </div>
    `;

    // Inject directly into body for fixed positioning
    document.body.appendChild(floatingButton);
    this.attachEventListeners();
    this.saveOriginalOrder();
    this.setupAutoplayHandling();
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

    // Action buttons
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
    // Try different selectors for playlist items (both full playlist page and side playlist)
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
      '#secondary .ytd-playlist-video-renderer'
    ];

    for (const selector of selectors) {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        console.log(`Found ${items.length} playlist items with selector: ${selector}`);
        return Array.from(items);
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
      this.originalOrder = this.getPlaylistItems().map(item => item.cloneNode(true));
    }
  }

  reversePlaylist() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;

    const container = items[0].parentNode;
    const reversedItems = items.reverse();
    
    // Remove all items
    items.forEach(item => item.remove());
    
    // Add them back in reverse order
    reversedItems.forEach(item => container.appendChild(item));
    
    this.currentSortType = 'reverse';
    this.showNotification('Playlist reversed! 🔄');
  }

  shufflePlaylist() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;

    const container = items[0].parentNode;
    
    // Fisher-Yates shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    
    // Remove all items
    items.forEach(item => item.remove());
    
    // Add them back in shuffled order
    items.forEach(item => container.appendChild(item));
    
    this.currentSortType = 'shuffle';
    this.showNotification('Playlist shuffled! 🔀');
  }

  sortAlphabetical() {
    const items = this.getPlaylistItems();
    if (items.length === 0) {
      this.showNotification('No playlist items found!', 'error');
      return;
    }

    const container = items[0].parentNode;
    
    // Sort by title - try multiple selectors for video titles
    items.sort((a, b) => {
      const titleA = this.getVideoTitle(a);
      const titleB = this.getVideoTitle(b);
      return titleA.localeCompare(titleB);
    });
    
    // Remove all items
    items.forEach(item => item.remove());
    
    // Add them back in sorted order
    items.forEach(item => container.appendChild(item));
    
    this.currentSortType = 'alphabetical';
    this.showNotification('Playlist sorted alphabetically! 🔤');
  }

  getVideoTitle(item) {
    const titleSelectors = [
      // Main playlist selectors
      '#video-title',
      '.ytd-playlist-video-renderer #video-title',
      'a[id="video-title"]',
      '[id="video-title"] span',
      // Side playlist selectors (ytd-playlist-panel-renderer)
      '.ytd-playlist-panel-video-renderer #video-title',
      'ytd-playlist-panel-renderer #video-title',
      '.ytd-playlist-panel-video-renderer a[href*="watch"]',
      // Generic fallbacks
      'h3 a', 
      '.video-title',
      'a[href*="watch"] span',
      '[class*="title"] a'
    ];

    for (const selector of titleSelectors) {
      const element = item.querySelector(selector);
      if (element && element.textContent) {
        const title = element.textContent.trim();
        if (title.length > 0) {
          return title;
        }
      }
    }
    
    // Additional fallback: look for any link with watch in href
    const links = item.querySelectorAll('a[href*="watch"]');
    for (const link of links) {
      if (link.textContent && link.textContent.trim().length > 0) {
        return link.textContent.trim();
      }
    }
    
    return 'Unknown Title';
  }

  sortByDuration() {
    const items = this.getPlaylistItems();
    if (items.length === 0) {
      this.showNotification('No playlist items found!', 'error');
      return;
    }

    const container = items[0].parentNode;
    
    // Sort by duration
    items.sort((a, b) => {
      const durationA = this.getVideoDuration(a);
      const durationB = this.getVideoDuration(b);
      return durationA - durationB;
    });
    
    // Remove all items
    items.forEach(item => item.remove());
    
    // Add them back in sorted order
    items.forEach(item => container.appendChild(item));
    
    this.currentSortType = 'duration';
    this.showNotification('Playlist sorted by duration! ⏱️');
  }

  getVideoDuration(item) {
    const durationSelectors = [
      '.ytd-thumbnail-overlay-time-status-renderer',
      '.ytd-playlist-video-renderer .ytd-thumbnail-overlay-time-status-renderer',
      '.ytd-playlist-panel-video-renderer .ytd-thumbnail-overlay-time-status-renderer',
      '[class*="duration"]',
      '[class*="time-status"]',
      '.video-duration'
    ];

    for (const selector of durationSelectors) {
      const element = item.querySelector(selector);
      if (element && element.textContent) {
        return this.parseDuration(element.textContent);
      }
    }
    return 0;
  }

  sortByUploadDate() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;

    const container = items[0].parentNode;
    
    // Sort by upload date (newest first)
    items.sort((a, b) => {
      const dateA = this.parseUploadDate(this.getUploadDateText(a));
      const dateB = this.parseUploadDate(this.getUploadDateText(b));
      return dateB - dateA; // Newest first
    });
    
    // Remove all items
    items.forEach(item => item.remove());
    
    // Add them back in sorted order
    items.forEach(item => container.appendChild(item));
    
    this.currentSortType = 'upload-date';
    this.showNotification('Playlist sorted by upload date! 📅');
  }

  getUploadDateText(item) {
    // Try multiple selectors for upload date (updated for both main and side playlists)
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
      // More generic selectors for side playlist
      '.ytd-playlist-panel-video-renderer [class*="metadata"] span:last-child',
      '#secondary .ytd-playlist-video-renderer #metadata span:last-child'
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

    return 'Unknown date';
  }

  isDateText(text) {
    const dateIndicators = [
      'ago', 'second', 'minute', 'hour', 'day', 'week', 'month', 'year',
      'yesterday', 'today', 'Streamed', 'Premiered'
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
    const parts = durationText.trim().split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // minutes:seconds
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hours:minutes:seconds
    }
    return 0;
  }

  resetPlaylist() {
    if (!this.originalOrder || this.originalOrder.length === 0) {
      this.showNotification('No original order saved!', 'error');
      return;
    }

    const items = this.getPlaylistItems();
    if (items.length === 0) return;

    const container = items[0].parentNode;
    
    // Remove current items
    items.forEach(item => item.remove());
    
    // Add original items back
    this.originalOrder.forEach(item => container.appendChild(item.cloneNode(true)));
    
    this.currentSortType = null;
    this.showNotification('Playlist restored to original order! 🔄');
  }

  showNotification(message, type = 'success') {
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
    const reversedItems = items.reverse();
    items.forEach(item => item.remove());
    reversedItems.forEach(item => container.appendChild(item));
  }

  sortAlphabeticalSilent() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;
    const container = items[0].parentNode;
    items.sort((a, b) => {
      const titleA = this.getVideoTitle(a);
      const titleB = this.getVideoTitle(b);
      return titleA.localeCompare(titleB);
    });
    items.forEach(item => item.remove());
    items.forEach(item => container.appendChild(item));
  }

  sortByDurationSilent() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;
    const container = items[0].parentNode;
    items.sort((a, b) => {
      const durationA = this.getVideoDuration(a);
      const durationB = this.getVideoDuration(b);
      return durationA - durationB;
    });
    items.forEach(item => item.remove());
    items.forEach(item => container.appendChild(item));
  }

  sortByUploadDateSilent() {
    const items = this.getPlaylistItems();
    if (items.length === 0) return;
    const container = items[0].parentNode;
    items.sort((a, b) => {
      const dateA = this.parseUploadDate(this.getUploadDateText(a));
      const dateB = this.parseUploadDate(this.getUploadDateText(b));
      return dateB - dateA;
    });
    items.forEach(item => item.remove());
    items.forEach(item => container.appendChild(item));
  }
}

// Initialize the playlist manager
new PlaylistManager();
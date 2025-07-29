# YouTube Playlist Manager Extension

A Chrome browser extension that allows you to reorder, reverse, and reorganize YouTube playlist videos with ease.

## Features

- **🔄 Reverse Order**: Flip your entire playlist to play from bottom to top
- **🔀 Shuffle**: Randomly reorder all videos in the playlist
- **🔤 Alphabetical Sort**: Sort videos by title alphabetically (A-Z)
- **⏱️ Duration Sort**: Arrange videos from shortest to longest
- **📅 Upload Date Sort**: Sort videos by upload date (newest first)
- **🔄 Reset**: Restore the original playlist order
- **🎯 Smart Autoplay**: Maintains your custom sort order during video playback
- **📱 Universal Support**: Works on both playlist pages and video watch pages with playlists

## Installation

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. **Download the files**: Save all the provided files in a folder on your computer:
   - `manifest.json`
   - `content.js`
   - `styles.css`
   - `popup.html`

2. **Open Chrome Extensions Page**:
   - Go to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**:
   - Click "Load unpacked"
   - Select the folder containing your extension files
   - The extension should now appear in your extensions list

5. **Pin the Extension** (Optional):
   - Click the puzzle piece icon in Chrome's toolbar
   - Pin the "YouTube Playlist Manager" extension for easy access

### Method 2: Create Extension Package

1. Create a new folder named `youtube-playlist-manager`
2. Save all the files in this folder
3. Follow the unpacked installation steps above

## Usage

1. **Navigate to YouTube**: Go to [youtube.com](https://youtube.com)

2. **Open a Playlist**: 
   - Go to a playlist page directly, OR
   - Start watching any video from a playlist (the side playlist will appear)

3. **Find the Floating Button**: Look for the floating 🎵 button in the bottom-right corner of the page

4. **Open Options Menu**: Click the floating button to open the options popup

5. **Use the Features**:
   - **Reverse Order**: Click "↕️ Reverse Order" to flip the playlist
   - **Shuffle**: Click "🔀 Shuffle" to randomize video order
   - **Sort A-Z**: Click "🔤 Sort A-Z" to organize alphabetically
   - **Sort by Duration**: Click "⏱️ Sort by Duration" to arrange by video length
   - **Sort by Upload Date**: Click "📅 Sort by Upload Date" to show newest videos first
   - **Reset**: Click "🔄 Reset Original" to restore the original order

6. **Close Menu**: Click the × button or click outside the popup to close it

7. **Autoplay Support**: When watching videos from a playlist, your custom sort order will be maintained as videos autoplay to the next one

5. **View Status**: Click the extension icon in your toolbar to see the current status and features overview

## How It Works

The extension uses a content script that:
- Detects when you're viewing a YouTube playlist (both playlist pages and video watch pages)
- Injects a floating button in the bottom-right corner
- Shows a popup with sorting options when clicked
- Manipulates the DOM to reorder video elements in both main playlists and side playlists
- Maintains custom sort order during video autoplay
- Saves the original order so you can reset changes
- Works with YouTube's dynamic page loading (SPA navigation)

## Troubleshooting

### Floating Button Not Appearing
- Make sure you're on a playlist page (URL contains `playlist?list=`) OR watching a video from a playlist
- Try refreshing the page
- Check that the extension is enabled in `chrome://extensions/`
- Look in the bottom-right corner of the page

### Sort Order Not Maintained During Autoplay
- This feature works when watching videos from a playlist (not individual videos)
- Make sure autoplay is enabled in YouTube
- The extension will maintain the sort order as videos transition

### Extension Not Working
- Ensure Developer Mode is enabled
- Try disabling and re-enabling the extension
- Check the browser console for any error messages (F12 → Console)

### Reset Not Working
- The reset function only works if you've made changes after the page loaded
- Try refreshing the page to get the true original order

## Technical Details

### Files Structure
```
youtube-playlist-manager/
├── manifest.json      # Extension configuration
├── content.js         # Main functionality script
├── styles.css         # Styling for the controls
├── popup.html         # Extension popup interface
└── README.md          # This file
```

### Permissions Used
- `activeTab`: To interact with the current YouTube tab
- `scripting`: To inject the content script
- `*://*.youtube.com/*`: To access YouTube pages

### Browser Compatibility
- Chrome (Manifest V3)
- Microsoft Edge (Chromium-based)
- Other Chromium-based browsers

## Limitations

- Only works on YouTube playlist pages
- Changes are temporary (reset on page refresh)
- Cannot modify the actual YouTube playlist (only visual reordering)
- Some YouTube layout changes might affect functionality

## Privacy

This extension:
- Only works on YouTube pages
- Does not collect or store any personal data
- Does not send data to external servers
- Only manipulates the visual order of playlist items

## Contributing

Feel free to modify and improve the extension:
1. Make your changes to the relevant files
2. Test the changes by reloading the extension in `chrome://extensions/`
3. Share improvements or report issues

## Version History

- **v1.0**: Initial release with reverse, shuffle, sort, and reset functionality
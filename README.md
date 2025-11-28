# Square Search

Square Search is a Manifest V3 Chrome extension that recreates a “circle-to-search” style experience on desktop browsers. Click the action button (or press the configurable keyboard shortcut) to draw a region on any page, capture a high-resolution crop, and instantly see Gemini’s contextual answer in a modern, collapsible side panel. You can also send the same crop to Google Lens with one click for visual lookups.

## Features

- **Inline capture & answers**: draw a selection overlay and view the cropped image plus Gemini’s markdown-formatted response directly inside the page.
- **Provider routing**: configurable Gemini Vision model + API key stored in `chrome.storage.sync`.
- **Google Lens handoff**: optional “Search on Google” chip uploads the crop to lens.google.com in a new tab.
- **Custom keyboard shortcuts**: default `Command+Shift+S` (macOS) / `Ctrl+Shift+S` (Windows/Linux) with per-OS overrides in the options page.
- **Modern UI**: glassmorphic panel with collapsible handle, prompt refinements, loading states, and error messaging.

## Getting Started

1. **Install dependencies**  
The project is plain HTML/JS/CSS—no build step is required.

2. **Load the extension**
   - Open `chrome://extensions` (or `edge://extensions`).
   - Enable “Developer mode”.
   - Click “Load unpacked” and choose the `/square` directory.

3. **Configure Gemini**
   - In the extension card, click “Details” → “Extension options”.
   - Enter your Gemini API key (e.g., from Google AI Studio) and desired model ID (`gemini-2.5-flash` by default).
   - Optionally adjust the keyboard shortcuts per platform.

4. **Use Square Search**
   - Navigate to any regular webpage (not `chrome://` or other restricted schemes).
   - Click the toolbar icon **or** press the shortcut (`Cmd/Ctrl+Shift+S`).
   - Drag to select an area; the side panel will appear with the crop preview, Gemini response, and controls.
   - Use the “Search on Google” chip to open Lens results in a new tab if needed.

## Customizing Shortcuts

- Open the options page and edit the macOS/Windows/Linux fields using `Modifier+Modifier+Key` notation (e.g., `Ctrl+Alt+J`).
- Saved shortcuts are stored in `chrome.storage.sync` and honored by both the content-script listener and the background command handler.

## Development Notes

- The project is intentionally framework-free; Chrome loads `.js` files directly from `src/`.
- When editing files, keep each module focused (overlay logic, utils, etc.) to maintain the single-responsibility structure.
- After modifying `manifest.json`, you must reload the extension for changes to take effect.

## License

MIT. Use, modify, or extend Square Search however you like. Contributions are welcome!


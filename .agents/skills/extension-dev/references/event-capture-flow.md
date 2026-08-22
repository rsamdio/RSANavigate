# Event Capture & Snapshot Protocol

## Capture Protocol Flow
1. User clicks **"Start Recording"** in Extension Popup.
2. Background service worker injects `contentScript.js`.
3. When user clicks a target element on the webpage:
   - Coordinates (`x`, `y`, `width`, `height`, `scrollX`, `scrollY`) are computed.
   - Robust CSS selector is generated via `generateCssSelector()`.
   - Complete `document.documentElement.outerHTML` and all inline/linked `<style>` rules are serialized into a `DOMSnapshot`.
4. The snapshot is stored in temporary extension state.
5. On **"Finish Recording"**, the extension redirects to `${VITE_STUDIO_URL}/admin/editor/{demoId}`.

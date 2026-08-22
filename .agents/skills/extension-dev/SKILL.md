---
name: extension-dev
description: >-
  Procedures for Chrome Extension MV3 development, DOM tree capture, content scripts, and Studio communication.
  Use when modifying packages/ext-tour, recording workflows, or debugging browser event interception.
---

# Chrome Extension Development Skill

This skill governs development and enhancements to the `@serverless-tour/ext-tour` Manifest V3 extension.

---

## Extension Structure

* **`src/content/recorder.ts`**: Content script injected into target pages. Intercepts click/input events, clones DOM subtrees, serializes CSS stylesheets, and sends snapshots to the background coordinator.
* **`src/background/serviceWorker.ts`**: Background service worker handling state transitions and Studio launch redirections.
* **`src/popup/Popup.tsx`**: Lightweight control UI for starting/stopping recordings and viewing captured steps.

For technical details on DOM serialization and style capture, see: [event-capture-flow.md](./references/event-capture-flow.md)

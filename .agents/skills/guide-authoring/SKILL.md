---
name: guide-authoring
description: >-
  Procedures for building, editing, and annotating interactive walkthroughs in NAVIGATE Studio.
  Use when working on StudioEditor, PublicTourPlayer, DOM privacy redaction, simulated typing, branching, and hotspot positioning.
---

# Guide Authoring & Interactive Elements Skill

This skill guides development and enhancement of the interactive guide authoring suite.

---

## Key Workflows

### 1. Element Targeting & Positioning
* Use `findElementInSnapshot(doc, selector, coordinates)` to resolve targets inside rehydrated iframes.
* Calculate tooltip placement dynamically with `computeTooltipPosition()`.
* Ensure `PublicTourPlayer` binds sticky `scroll` and `resize` listeners to `iframe.contentWindow` so tooltips stay glued to live elements during scrolling.

### 2. DOM Privacy Redaction & Content Rewriting
* When modifying snapshots in Studio Canvas, apply `DOMModification` rules:
  * `blur`: Injects `filter: blur(8px) !important; user-select: none !important;`
  * `hide`: Injects `display: none !important;`
  * `replaceText`: Overwrites `element.textContent` with customized text string.
* For detailed specifications, see: [dom-mutation-spec.md](./references/dom-mutation-spec.md)

### 3. Branching & Simulated Form Inputs
* Multi-Action CTAs support `jumpToStep`, `openUrl`, `next`, and `prev`.
* Form inputs trigger `simulateTypingInElement()` to realistically type characters when active.
* For action payload structures, see: [branching-logic.md](./references/branching-logic.md)

# Architectural Decision Records (ADRs) & Harness Memory

This document stores key architectural decisions made during development to preserve historical context and prevent future agents from undoing established patterns.

---

## ADR-001: Zero-Database Public Playback Architecture
* **Status**: Accepted & Active
* **Context**: Public viewers visiting walkthroughs must have sub-50ms load times globally without scaling database costs.
* **Decision**: Public viewer (`/view/:demoId`) consumes only static `manifest.json` and cached DOM snapshots hosted on Cloudflare R2 CDN. Firestore is never queried during public playback.
* **Consequence**: $0.00 database bill, infinite scaling for public traffic.

---

## ADR-002: Server-Side Secret Isolation in Cloud Functions
* **Status**: Accepted & Active
* **Context**: Direct S3 credentials in browser bundles pose a risk of unauthorized bucket writes.
* **Decision**: Cloudflare R2 secrets (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) remain in Firebase Cloud Functions environment configs (`packages/functions/.env`). The client uploads via short-lived presigned URLs.
* **Consequence**: Zero secrets in client JavaScript and Chrome Extension code.

---

## ADR-003: 60fps Native Iframe Sticky Scroll Tracking
* **Status**: Accepted & Active
* **Context**: When a user scrolls up or down on long captured pages, fixed-position tooltips must stay accurately pinned to target DOM elements.
* **Decision**: Remove artificial browser window frames. Rehydrate the target DOM full-bleed inside an iframe and bind passive `scroll` & `resize` event listeners to `iframe.contentWindow`. Tooltips and beacons recalculate dynamic coordinates in real time.
* **Consequence**: Walkthroughs feel like a live, native website.

---

## ADR-004: Universal Classy Light Theme
* **Status**: Accepted & Active
* **Context**: Match the official branding and visual positioning of Rotaract South Asia MDIO.
* **Decision**: Universal palette centered on RSA Navy (`#0c3c60`), slate backgrounds, and crisp typography.
* **Consequence**: Clean, trustworthy, non-profit guide portal identity matching `navigate.rsamdio.org`.

---

## ADR-005: Continuous Codebase Index Maintenance
* **Status**: Accepted & Active
* **Context**: As codebase evolves with new components, services, and scripts, out-of-date indexes lead to hallucinated paths, broken symbol lookups, and developer friction.
* **Decision**: Mandate that `.agents/INDEX.md` is updated on every file addition, rename, restructuring, or build, backed by programmatic verification in `scripts/harness-verify.js`.
* **Consequence**: Guaranteed 100% accurate symbol map and zero index drift across the monorepo.

---

## ADR-006: Step Snapshot Reference Immutability & Floating Obstacle Avoidance
* **Status**: Accepted & Active
* **Context**: 
  1. Fallback rendering logic when snapshots are temporarily unresolved must never overwrite the step document's permanent `snapshotUrl` in Firestore or IndexedDB. Doing so irrevocably overwrites unique captured DOM snapshots with sibling placeholders upon save.
  2. Floating UI elements (such as the top-left navigation title card in Public Tour Player) risk occluding anchored tooltips and "Return to highlighted element" action buttons.
* **Decision**: 
  1. In-memory fallback snapshots (`setCurrentSnapshot`) must remain strictly isolated to the local canvas view and never mutate `step.snapshotUrl`.
  2. `computeTooltipPosition` enforces obstacle boundary checks (`ObstacleRect`) to automatically shunt tooltips away from floating headers and critical navigation controls.
  3. Recorded tour ingestion checks `isPlaceholderOnly` to cleanly replace starter placeholders instead of prepending them to the step sequence.
* **Consequence**: Safe editing, zero accidental snapshot mutation, and reliable 0% occlusion in public playback.

---

## ADR-007: Element-Specific Global Design Defaults & Non-Destructive Step Inheritance
* **Status**: Accepted & Active
* **Context**: Authors previously had to configure visual design parameters (theme color, card style, element style, backdrop, target outline, beacon alignment, callout placement) redundantly on every single step. In addition, setting flat global defaults caused semantic dissonance (e.g. configuring card styles for Beacons, or hotspot alignments for Modals), and users needed custom hex color codes rather than just 6 fixed presets. Changing global defaults directly into all steps in Firestore would also be destructive and cause heavy write spikes.
* **Decision**: 
  1. Guide Settings modal is partitioned into **General Settings** (administrative metadata) and **Design & Branding** (`defaultStepSettings`).
  2. Brand Accent Color supports both one-click curated presets and custom Hex code input with live color picker synchronization.
  3. Global Defaults feature dedicated sub-tabs partitioned by element type:
     - **Tooltip Defaults** (`tooltipDefaults`): Card surface style, callout placement, target outline box, page focus & backdrop, pulsing beacon toggle + beacon pin position.
     - **Beacon Defaults** (`beaconDefaults`): Hotspot pin alignment, animation style (pulse/dot/icon), icon picker, target outline, page focus & backdrop. (Excludes card surfaces and callout placements).
     - **Modal Defaults** (`modalDefaults`): Modal card surface style, modal backdrop scrim. (Excludes target outlines, beacons, and callout placements).
  4. Visual properties resolve via read-time non-destructive fallback hierarchy: `Step Override ?? Element-Specific Global Default (stepType + 'Defaults') ?? Flat Global Default ?? System Default`.
  5. New steps auto-seed visual properties directly from the corresponding element-specific defaults.
  6. Authors can explicitly trigger type-aware bulk application ("⚡ Apply Defaults to All Steps") in Tab 2 to update all in-memory steps with their respective element defaults while strictly preserving step content (selectors, coordinates, actions, titles, descriptions).
  7. Public Tour Player manifests (`manifest.defaultStepSettings`) retain element-specific defaults for $0.00 CDN Edge playback parity.
* **Consequence**: Ultra-fast guide styling, strict semantic clarity per element type, granular brand consistency across all steps, and zero write thrashing.

---

## ADR-008: Pre-Production Hardening: Test Player Feedback, Accurate Publish Lifecycle & Manifest Parity
* **Status**: Accepted & Active
* **Context**: 
  1. The Test Player button performed an asynchronous pre-flight save without user feedback, causing uncertainty about whether the click registered.
  2. The Publish Confirmation dialog statically reported "Publicly Accessible & Live" even for unpublished drafts, and lacked vanity slug customization shortcuts.
  3. `loadPublicTourManifest` fallback manifest construction omitted `defaultStepSettings` and step visual tokens (`focusBackdrop`, `targetHighlight`, `buttonLayout`), causing Test Player drafts to diverge from published guides.
  4. Targeted steps risked being misclassified as modals if `defaultStepSettings.stepType === 'modal'`.
  5. The Chrome extension hardcoded port 5173 for local tab discovery, failing on alternative ports like 3000.
* **Decision**: 
  1. Add `isOpeningTestPlayer` state with spinner and `Opening Test...` label on the Test Player button.
  2. Render dynamic status in the Publish dialog (`Live` vs `Draft (Unpublished)`) and provide a 1-click slug editing shortcut to Guide Settings.
  3. Synchronize `loadPublicTourManifest` fallback step mapping and manifest properties with `publishTourManifest`.
  4. Safeguard modal classification to require absent target selectors and coordinates before falling back to global modal defaults.
  5. Broaden extension local tab discovery across all `localhost` and `127.0.0.1` ports.
  6. Support unpublishing guides back to Draft status (`unpublishDemo`).
---

## ADR-009: Monorepo Lifecycle Resilience & Zero-Orphan Storage Architecture
* **Status**: Accepted & Active
* **Context**: Deep trace analysis of the entire creator-to-viewer lifecycle revealed:
  1. `handleSaveAll` dropped 4 fields (`slug`, `defaultStepSettings`, `coverImageUrl`, `isFeatured`), causing silent data loss on manual saves (`Cmd+S`).
  2. Duplicating guides dropped 7 fields and left branching jump buttons pointing to old step IDs.
  3. Deleting guides purged only `manifest.json`, leaving orphaned step snapshots on Cloudflare R2 and stale entries in the public catalog.
  4. Unpublishing was a local-only stub that left live guides on Edge CDN.
  5. Step deletion/duplication left non-contiguous step numbering gaps.
  6. The Advanced tab lacked UI controls for simulated input typing and audio narration.
  7. Public Player progress calculation was off-by-one and `allowStepJumping: false` was never enforced on progress dots.
* **Decision**:
  1. `handleSaveAll` commits all 13 demo fields in batch.
  2. `duplicateDemo` deep-clones all metadata and builds an `oldStepId -> newStepId` lookup to remap `jumpToStep` actions.
  3. `deleteTourAssets` uses `ListObjectsV2Command` to delete all R2 objects under `demos/${demoId}/` and synchronizes `catalog.json`.
  4. `unpublishTourManifest` Cloud Function cleanly purges R2 manifests, updates Firestore, and re-syncs Edge `catalog.json`.
  5. Step numbers are re-sequenced contiguously (`1..N`) after any step addition, deletion, or duplication.
  6. Studio Advanced tab exposes Simulated Input Typing (`textToType`, `typingSpeedMs`, and live canvas test trigger) and Audio Narration (`audioUrl` and inline audio player).
  7. Public Tour Player enforces `allowStepJumping`, corrects progress bar calculation to `((currentStepIndex + 1) / totalSteps) * 100`, and manages audio narration streaming with mute controls.
* **Consequence**: Full lifecycle resilience, zero orphaned storage on R2 or IndexedDB, accurate public directory reflection, and flawless end-to-end authoring and viewing experience.







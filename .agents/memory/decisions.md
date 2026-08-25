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


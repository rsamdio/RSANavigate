# Architectural Invariants & Security Boundaries

When modifying or extending any part of the codebase, adhere strictly to these architectural invariants:

---

## 1. Zero-Database Edge Architecture
* **Public Tours (`/view/:id`)**: Must load 100% of data statically via `TourManifest` (`manifest.json`) and snapshot JSON files hosted on Cloudflare R2 / Edge CDN.
* **Never add Firestore queries to PublicTourPlayer**: Public playback must work seamlessly even if Firestore is completely offline or quota-locked.

## 2. Server-Side Secret Isolation
* **Cloudflare R2 Secrets**: `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` must strictly reside in Firebase Cloud Functions environment configs (`functions.config().r2` or `process.env`).
* **No Client Leaks**: Never import, reference, or bundle secret keys into `packages/client` or `packages/ext-tour`.

## 3. Free-Tier Operational Discipline
* All architecture is engineered for **$0.00/month** non-profit hosting.
* Firebase usage is limited to creator authoring and stays well below the 2,000,000 monthly free Cloud Function calls and 50,000 daily Firestore reads.

## 4. DOM Rehydration & Privacy Integrity
* Any sensitive member data (emails, balance numbers, tokens) masked via `DOMModification` (`blur`, `hide`, `replaceText`) must be reliably injected into the rehydrated snapshot iframe upon rendering.

## 5. Index Synchronization Invariant
* Whenever a new file, service, component, or package is created, renamed, or deleted, [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/INDEX.md) MUST be updated in the same turn to ensure the codebase map remains 100% accurate.

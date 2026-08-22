# NAVIGATE Codebase Index & Symbol Map

This index provides a fast lookup map for all modules, services, and components across the monorepo to eliminate exploratory search overhead.

---

## 1. `packages/common` (Shared Core Engine)
* [`src/types/demo.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/types/demo.ts): Core schema (`DemoDocument`, `StepDocument`, `TourManifest`, `StepManifest`, `DOMModification`, `StepAction`, `InputAction`, `BeaconConfig`).
* [`src/types/snapshot.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/types/snapshot.ts): DOM Snapshot schema (`DOMSnapshot`, `ClickedElementInfo`, `RehydrationOptions`).
* [`src/dom/rehydrator.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/dom/rehydrator.ts): Sandboxed iframe rehydration engine (`rehydrateIframeSnapshot`, `applyDOMModifications`, `simulateTypingInElement`, `findElementInSnapshot`, `computeTooltipPosition`).
* [`src/dom/selector.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/dom/selector.ts): Resilient CSS selector generator (`generateCssSelector`, `getElementCoordinates`).
* [`src/storage/r2Client.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/storage/r2Client.ts): S3-compatible R2 upload & fetch helpers (`createR2Client`, `uploadDOMSnapshotToR2`, `uploadManifestToR2`, `fetchManifestFromR2`).

---

## 2. `packages/client` (React + Vite Web App)
### Pages & Router
* [`src/App.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/App.tsx): Application routes (`/`, `/view/:demoId`, `/admin`, `/admin/login`, `/admin/editor/:demoId`).
* [`src/pages/PublicLandingPage.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/pages/PublicLandingPage.tsx): Rotaract South Asia MDIO Guide Directory with category filters, search, and direct new-tab launcher.
* [`src/pages/AdminAuthPage.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/pages/AdminAuthPage.tsx): Dedicated creator and super admin authentication page.

### Core Components
* [`src/components/player/PublicTourPlayer.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/player/PublicTourPlayer.tsx): Full-bleed zero-database tour player with 60fps sticky scroll tracking, beacons, spotlights, multi-action branching, and simulated input typing.
* [`src/components/studio/StudioEditor.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/studio/StudioEditor.tsx): 3-pane walkthrough builder (Pane 1: Timeline, Pane 2: Canvas + DOM Privacy Editor, Pane 3: Step & Beacon Inspector).
* [`src/components/dashboard/Dashboard.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/dashboard/Dashboard.tsx): Admin guide manager with live/draft status toggles, duplication, and search.
* [`src/components/admin/AdminProtectedRoute.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/admin/AdminProtectedRoute.tsx): RBAC guard separating Super Admins & Creators from Pending users.
* [`src/components/admin/AdminUserManagementModal.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/admin/AdminUserManagementModal.tsx): Super Admin creator approval and role management modal.

### Services & Data
* [`src/services/firebase.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/services/firebase.ts): Firebase Auth, Firestore, and Cloud Functions invocation helpers.
* [`src/services/demoService.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/services/demoService.ts): Guide persistence layer (Cloud Functions / Firestore + LocalStorage fallback + R2 manifest publishing).
* [`src/services/configService.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/services/configService.ts): Environment configuration reader & offline mock mode resolver.
* [`src/sampleData/defaultDemos.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/sampleData/defaultDemos.ts): Authentic My Rotary sample snapshots and starter guides.

---

## 3. `packages/functions` (Firebase Cloud Functions)
* [`src/index.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/functions/src/index.ts): Callable server-side functions:
  * `getPresignedUploadUrl`: Generates secure S3 PUT URLs for R2 snapshot uploads.
  * `publishTourManifest`: Compiles and deploys `manifest.json` directly to R2 bucket.
  * `setUserRole`: Super Admin role management API.

---

## 4. `packages/ext-tour` (Chrome Extension MV3)
* [`src/content/recorder.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/src/content/recorder.ts): Injected recorder capturing clicks, coordinates, DOM HTML, and CSS rules.
* [`src/background/serviceWorker.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/src/background/serviceWorker.ts): Service worker managing recording sessions and Studio redirection.
* [`src/popup/Popup.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/src/popup/Popup.tsx): Extension popup interface.

# NAVIGATE Codebase Index & Symbol Map

This index provides a fast lookup map for all modules, services, pages, utilities, and components across the monorepo to eliminate exploratory search overhead.

---

## 1. `packages/common` (Shared Core Engine)
* [`src/index.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/index.ts): Main export file for the shared package exposing the types, DOM selector, DOM serializer, DOM rehydrator, and R2 client.
* [`src/types/demo.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/types/demo.ts): Core TypeScript definitions and schemas (`DemoDocument`, `StepDocument`, `TourManifest`, `StepManifest`, `DOMModification`, `StepAction`, `InputAction`, `BeaconConfig`, `FirebaseConfig`, `R2Config`).
* [`src/types/snapshot.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/types/snapshot.ts): DOM Snapshot schema representing captured page states (`DOMSnapshot`, `ClickedElementInfo`, `RehydrationOptions`, `CaptureOptions`).
* [`src/constants/appConfig.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/constants/appConfig.ts): Static client-side production config values for Firebase Auth/Firestore and Cloudflare R2 bucket configurations.
* [`src/dom/serializer.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/dom/serializer.ts): Captured step DOM serialization and sanitization utility (`generateCssSelector`, `generateXPath`, `getElementCoordinates`, `collectDocumentStyles`, `serializeDOM`, `captureDOMSnapshot`). Inlines WebP-scaled images and canvas states while scrubbing scripts/CSP tags.
* [`src/dom/rehydrator.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/dom/rehydrator.ts): Sandboxed iframe rehydration engine (`rehydrateIframeSnapshot`, `applyDOMModifications`, `simulateTypingInElement`, `findElementInSnapshot`, `computeTooltipPosition`). Translates static snapshots back to live, interactive pages.
* [`src/storage/r2Client.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common/src/storage/r2Client.ts): S3-compatible R2 upload & fetch helpers (`createR2Client`, `uploadDOMSnapshotToR2`, `uploadManifestToR2`, `fetchManifestFromR2`). Used for publishing static JSON assets to Cloudflare CDN.

---

## 2. `packages/client` (React + Vite Web App)
### Configuration & Initialization
* [`vite.config.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/vite.config.ts): Vite build config for the client application.
* [`src/main.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/main.tsx): Entry point rendering the React application root.
* [`src/vite-env.d.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/vite-env.d.ts): TypeScript environment definitions for Vite.

### Pages & Router
* [`src/App.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/App.tsx): Main application router and shell declaring routes for the landing page, preview player, auth pages, and editor:
  * `/` -> `PublicLandingPage`
  * `/view/:demoId` -> `PublicTourPlayer`
  * `/admin` -> `Dashboard` (Admin)
  * `/admin/login` -> `AdminAuthPage`
  * `/admin/editor/:demoId` -> `StudioEditor`
  * `/privacy` -> `PrivacyPolicyPage`
  * `/terms` -> `TermsPage`
* [`src/pages/PublicLandingPage.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/pages/PublicLandingPage.tsx): Rotaract South Asia MDIO Guide Directory offering user-facing categories, search filters, and launch points.
* [`src/pages/AdminAuthPage.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/pages/AdminAuthPage.tsx): Dedicated creator and super admin authentication interface.
* [`src/pages/PrivacyPolicyPage.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/pages/PrivacyPolicyPage.tsx): Static privacy disclosure outlining extension DOM capturing privacy policies.
* [`src/pages/TermsPage.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/pages/TermsPage.tsx): Static terms of service outlining walkthrough usage terms.

### Core Component Packages
* [`src/components/player/PublicTourPlayer.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/player/PublicTourPlayer.tsx): Full-bleed tour playback view consuming static JSON manifests from CDN. Manages interactive iframe rehydration, spotlights, typing simulation, branching choices, and sticky scroll tracking.
* [`src/components/studio/StudioEditor.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/studio/StudioEditor.tsx): 3-pane walkthrough editor (Timeline panel, Sandboxed Canvas editor with DOM privacy masking, and Inspect/Action details configurations).
* [`src/components/dashboard/Dashboard.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/dashboard/Dashboard.tsx): Admin guide manager panel containing guide status updates, search, filters, and walkthrough cloning utilities.
* [`src/components/admin/AdminProtectedRoute.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/admin/AdminProtectedRoute.tsx): RBAC protective router component routing based on User Roles (Super Admin, Creator, Pending).
* [`src/components/admin/AdminUserManagementModal.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/admin/AdminUserManagementModal.tsx): Super Admin tool for managing creator signups, approvals, and roles.

### Shared Common UI Components
* [`src/components/common/Navbar.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/common/Navbar.tsx): Main application header containing branding, public showcase links, and user authentication dropdown selectors.
* [`src/components/common/AuthModal.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/common/AuthModal.tsx): Google OAuth authentication sign-in popup.
* [`src/components/common/ConfigModal.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/common/ConfigModal.tsx): Settings overlay allowing real-time workspace overrides for Firebase and Cloudflare R2 configurations.
* [`src/components/common/LabelInput.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/common/LabelInput.tsx): Unified, accessible form input component.
* [`src/components/common/CustomSelect.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/components/common/CustomSelect.tsx): Custom styled accessibility-compliant dropdown selector.

### Services & Data
* [`src/services/firebase.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/services/firebase.ts): Firebase initialization module. Handles authentication listeners, Firestore data access, and callable Cloud Function references.
* [`src/services/indexedDbService.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/services/indexedDbService.ts): Offline-first database service using client IndexedDB for local persistence of large drafts and captured DOM snapshots (`saveIdbSnapshot`, `getIdbSnapshot`, `saveIdbDraft`, `getIdbDraft`, `deleteIdbDraft`).
* [`src/services/demoService.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/services/demoService.ts): Persistence orchestrator between Remote Cloud Functions, Cloud Firestore, and Local IndexedDB fallbacks.
* [`src/services/configService.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/services/configService.ts): LocalStorage infrastructure configuration reader and offline simulator.
* [`src/sampleData/defaultDemos.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/sampleData/defaultDemos.ts): Static sample walkthrough metadata and starter guide structures.

### Utilities
* [`src/utils/imageUtils.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/utils/imageUtils.ts): Canvas-driven image compression helper converting custom uploads to lightweight WebP files before CDN storage upload (`convertImageToWebP`, `uploadCoverImage`).
* [`src/utils/seo.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client/src/utils/seo.ts): Dynamic Search and Open Graph metadata parser for managing HTML headers on the fly (`updatePageMetadata`, `resetToDefaultMetadata`).

---

## 3. `packages/functions` (Firebase Cloud Functions)
* [`src/index.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/functions/src/index.ts): Main Cloud Functions entry point declaring backend endpoints:
  * `getPresignedUploadUrl`: Issues secure, short-lived Cloudflare R2 S3 pre-signed PUT URLs for client snapshot uploads.
  * `publishTourManifest`: Edge deployment orchestrator. Bundles walkthrough config, images, and HTML into a flat static bundle, writing it directly to R2.
  * `setUserRole`: Super Admin RBAC role updater.

---

## 4. `packages/ext-tour` (Chrome Extension MV3)
* [`vite.config.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/vite.config.ts): Configuration bundle for compiling extension targets.
* [`src/vite-env.d.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/src/vite-env.d.ts): Extension TypeScript build context declarations.
* [`src/popup/main.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/src/popup/main.tsx): Root layout rendering the extension popup.
* [`src/popup/Popup.tsx`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/src/popup/Popup.tsx): User interface offering recording status toggles and configuration options.
* [`src/content/recorder.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/src/content/recorder.ts): DOM content recorder injected into host tabs. Capture page states, styling documents, clicking coordinate metadata, selectors, and forwards them to the extension runtime.
* [`src/background/serviceWorker.ts`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour/src/background/serviceWorker.ts): Service worker controller managing communication ports, recording state persistence, and redirection hooks to NAVIGATE Studio.

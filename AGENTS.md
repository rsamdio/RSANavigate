# RSANavigate Agent Workspace Controller

This repository is **NAVIGATE** (an interactive walkthrough and resource guide portal for Rotaract South Asia MDIO), powered by a zero-database serverless architecture.

---

## 1. Monorepo Map & Package Boundaries

* **[`packages/client`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client)**: React + Vite web application.
  * Public Guide Portal (`/`): Fast, lightweight directory for Rotary members.
  * Studio Editor (`/admin`): 3-pane interactive walkthrough builder.
  * Public Tour Player (`/view/:demoId`): Full-bleed, native iframe rehydration engine with 60fps sticky scroll tracking.
* **[`packages/common`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common)**: Shared TypeScript definitions, DOM snapshot rehydrator, typing simulator, and position calculators.
* **[`packages/functions`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/functions)**: Firebase Cloud Functions (Blaze free-tier) for server-side S3 presigned URLs, manifest publishing, and user role management.
* **[`packages/ext-tour`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour)**: Manifest V3 Chrome Extension for zero-friction browser DOM capture.

---

## 2. Core Architectural Invariants

1. **Zero-Database Public Playback**: Public viewers (`/view/:id`) must strictly consume static JSON manifests from Cloudflare R2 CDN ($0.00 database cost). Public viewers never query Firestore or trigger Cloud Functions.
2. **Server-Side Secret Isolation**: Cloudflare R2 secrets (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) remain in Firebase Cloud Functions environment variables and must **never** be bundled into browser client code or the extension.
3. **Classy Light Theme**: The interface uses a clean, modern palette (Slate/Blue/Navy `#0c3c60`) matching Rotaract South Asia MDIO branding.
4. **Progressive Context Loading**: Refer to specialized skills in `.agents/skills/` for detailed workflows rather than loading full context upfront.
5. **Continuous Index Synchronization**: Whenever code structure, files, endpoints, components, or directories are modified, [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/INDEX.md) must be updated in the same turn. See [`.agents/rules/index-maintenance.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/rules/index-maintenance.md).
6. **Zero Unauthorized Git Push / Deploy**: Never execute `git commit`, `git push`, or cloud deployments (`firebase deploy`, Netlify CLI) without explicit, direct user instructions. All changes must remain in the local working directory for user review.

---

## 3. Specialized Workspace Skills & Rules

* **Invariant Rules**:
  * [`index-maintenance`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/rules/index-maintenance.md): Real-time synchronization of `INDEX.md` upon every code/structural modification.
  * [`architecture-invariants`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/rules/architecture-invariants.md): Edge CDN playback, secret isolation, and data privacy rules.
  * [`code-style`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/rules/code-style.md): RSA Navy (`#0c3c60`) light palette and TypeScript conventions.

Activate these on-demand skills when performing domain-specific tasks:
* **`guide-authoring`**: Studio canvas, DOM privacy redaction/blurring, simulated input typing, branching, audio narration.
* **`edge-deployment`**: Cloudflare R2 static manifest compilation, Firebase Functions deployment, Netlify CI/CD.
* **`extension-dev`**: Chrome Extension MV3 recorder, event capturing, and Studio communication.
* **`security-rbac`**: Firebase Auth tokens, Firestore security rules, creator review workflows.

---

## 4. Sub-Agent Personas & Codebase Index

* **Complete Codebase Map**: [`./.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/INDEX.md)
* **Specialized Sub-Agents**:
  * [`guide-architect`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/agents/guide-architect.md): Canvas UX, DOM mutation & tooltip positioning math.
  * [`edge-ops`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/agents/edge-ops.md): Cloudflare R2 Edge manifests & Cloud Functions.
  * [`extension-eng`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/agents/extension-eng.md): MV3 Chrome Extension & DOM event capture.
  * [`security-guard`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/agents/security-guard.md): Auth tokens, RBAC roles & Firestore rules.

---

## 5. Harness Verification & Memory
* **Automated Self-Check**: Run `npm run verify` to validate builds, scan for secret leaks, and check 100% index sync.
* **Architectural Decisions Log**: [`./.agents/memory/decisions.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/memory/decisions.md) (Preserves project history and prevents undoing past architectural choices).

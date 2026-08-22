# NAVIGATE — Interactive Walkthroughs & Resource Guides

> **An Initiative by Rotaract South Asia MDIO**  
> A zero-database, serverless interactive walkthrough platform designed for seamless member onboarding, standard operating procedures, and step-by-step guidance across Rotary digital tools.

---

## 🌟 Overview

**NAVIGATE** is a modern interactive walkthrough and digital guide portal developed for Rotaract South Asia MDIO. It allows authorized creators to record step-by-step interactive tours directly on live websites (such as My Rotary, Rotary Club Central, district portals, and MDIO web apps) and publish them to a global edge CDN.

Public viewers experience lightning-fast, 60fps full-bleed interactive rehydration without requiring any database queries or expensive server runtimes.

---

## 🏛️ Core Architectural Invariants

1. **Zero-Database Public Playback ($0.00 Viewer Cost)**: Public viewers (`/view/:id` and `/:slug`) strictly stream static JSON manifests and pre-rendered DOM snapshots directly from Cloudflare R2 Edge CDN. Public playback incurs **$0.00 in database reads or egress fees**.
2. **Server-Side Secret Isolation**: Cloudflare R2 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) remain in secure Firebase Cloud Functions environment variables and are **never** bundled into browser client code or the extension.
3. **Seamless Multi-Domain Embedding**: Configured with modern `Content-Security-Policy: frame-ancestors` headers, allowing walkthroughs and the portal to be embedded inside `https://rsamdio.org`, district portals, and club websites.
4. **Classy Light Brand Aesthetic**: Crafted with a clean, modern palette (Slate / RSA Navy `#0c3c60` / Rotary Blue `#1d4ed8`) matching Rotaract South Asia MDIO branding.
5. **Generative Engine & SEO Optimized (GEO)**: Equipped with automated JSON-LD schemas (`WebApplication`, `FAQPage`, `Organization`), dynamic Open Graph cards, Twitter `@rsa_mdio` meta tags, `robots.txt`, and `sitemap.xml`.

---

## 🗺️ Route Architecture

| Route | Access Level | Description |
|---|---|---|
| **`/`** | **Public** | Public Guide Portal showcasing all live interactive walkthroughs with search, topic filters, and instant playback. |
| **`/:demoId`** or **`/view/:demoId`** | **Public (Zero-DB)** | Full-bleed interactive player streaming static walkthrough manifests from Cloudflare R2 Edge CDN. |
| **`/admin/login`** | **Public Auth** | Creator & Super Admin authentication portal with Google OAuth and email sign-in. |
| **`/admin`** | **Protected (Creator / Admin)** | Creator Studio Dashboard for managing drafts, batch actions, tags, and analytics. |
| **`/admin/editor/:demoId`** | **Protected (Creator / Admin)** | 3-Pane Visual Studio Canvas for annotating steps, element targeting, privacy redactions, and publishing. |
| **`/privacy`** | **Public** | Privacy Policy compliant with modern global data standards and Rotary guidelines. |
| **`/terms`** | **Public** | Terms of Service outlining authorized use and walkthrough creation policies. |

---

## 📦 Monorepo Package Structure

```
RSANavigate/
├── packages/
│   ├── client/           # React + Vite web application (Portal, Studio & Player)
│   ├── common/           # Shared TypeScript definitions, DOM rehydrator & utils
│   ├── ext-tour/         # Chrome MV3 Extension (In-page DOM recorder & floating widget)
│   └── functions/        # Firebase Cloud Functions (S3 Presigned URLs & RBAC management)
├── scripts/              # Packaging, build verification & harness test scripts
├── .agents/              # Agent skill registry, architectural memory & index
├── firestore.rules       # Role-Based Access Control security rules
└── netlify.toml          # Netlify build, SPA routing & CSP embedding headers
```

---

## 🛠️ Monorepo Workspaces

* **[`packages/client`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/client)**:
  * Built with React, Vite, Tailwind CSS, and Lucide Icons.
  * Optimized with Vite Rollup code splitting (separate React, Firebase, and Icon vendor chunks).
  * Includes automated console log and debugger stripping for production builds.
* **[`packages/common`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/common)**:
  * Shared TypeScript interfaces (`DemoDocument`, `StepDocument`, `TourManifest`, `DOMSnapshot`).
  * High-fidelity DOM rehydrator, simulated typing engine, and tooltip positioning math.
* **[`packages/ext-tour`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/ext-tour)**:
  * Manifest V3 Chrome Extension for zero-friction DOM capture.
  * Features an in-page floating recorder widget with manual view capture and direct step append support.
* **[`packages/functions`](file:///Users/zeospec/Dev/Code/RSANavigate/packages/functions)**:
  * Firebase Cloud Functions (Node.js 20) handling secure server-side presigned URLs and static manifest compilation.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
* **Public Portal**: [http://localhost:3000](http://localhost:3000)
* **Creator Studio**: [http://localhost:3000/admin](http://localhost:3000/admin)

### 3. Build & Package Chrome Extension
```bash
npm run build:ext
```
* Generates unpacked extension build in `packages/ext-tour/dist`.
* Automatically packages 1-click install ZIP at `packages/client/public/navigate-recorder-extension.zip`.

### 4. Run Automated Harness Verification
```bash
npm run verify
```
* Validates TypeScript compilation across all 4 workspaces.
* Scans client code for secret leaks.
* Checks codebase memory and architectural invariant compliance.

---

## 🌐 Production Deployment Guide (Netlify & Firebase)

### 1. Web Application Deployment (Netlify)
1. Link your repository to **Netlify**.
2. Netlify will automatically detect [`netlify.toml`](file:///Users/zeospec/Dev/Code/RSANavigate/netlify.toml):
   * **Build Command**: `npm run build:client`
   * **Publish Directory**: `packages/client/dist`
3. Configure environment variables in Netlify Settings:
   * `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
   * `VITE_R2_PUBLIC_URL`: Public CDN URL for Cloudflare R2 bucket.

### 2. Cloud Functions Deployment (Firebase)
```bash
firebase deploy --only functions,firestore:rules
```

---

## 🔒 Security & Privacy

* **Zero Secret Leakage**: Cloudflare R2 API keys and service account tokens are isolated to Cloud Functions.
* **DOM Privacy Blurring**: Creators can blur or redact sensitive member names, emails, and financial information directly within the Visual Studio Editor before publishing.
* **Role-Based Access Control (RBAC)**: Super Admin and Creator roles managed securely through Firebase Authentication and Firestore Security Rules.

---

## 📄 License & Organization

Developed for **Rotaract South Asia Multi-District Information Organization (MDIO)**.  
All rights reserved © Rotaract South Asia MDIO.

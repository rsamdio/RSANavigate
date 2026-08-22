# Serverless Interactive Demo Platform (TourEngine)

> A lightweight, zero-maintenance, self-hosted interactive product demo platform inspired by the open-source **Fable** (`sharefable/app`) architecture. Stripped of all heavy enterprise dependencies (Java Spring Boot, MySQL, SQS, AWS ECS/ALB, Auth0) and reimagined for a **100% free-tier serverless stack** ($0.00 / month).

---

## 🗺️ Route Architecture

| Route | Access Level | Description |
|---|---|---|
| **`/`** | **Public (Unauthenticated)** | High-converting landing page showcasing all published interactive demos with category filters, search, and instant in-page interactive playback. |
| **`/view/:demoId`** | **Public (Zero-Database)** | Standalone edge viewer streaming static `manifest.json` and snapshots from Cloudflare R2 / CDN. Zero database reads / $0 egress. |
| **`/admin/login`** | **Public Auth** | Dedicated sign-in portal for Super Admins and Creators (Google OAuth / Email). |
| **`/admin`** | **Protected (Admin & Creator)** | Author Dashboard for managing drafts, organizing steps, and viewing platform statistics. |
| **`/admin/studio/:demoId`** | **Protected (Admin & Creator)** | 3-Pane Visual Studio Editor for annotating steps, placing hotspots, and publishing to R2. |

---

## 🏗️ Architecture & Traffic Separation

```
[ Author Recording ]
       │
       ▼
 Chrome Extension (packages/ext-tour)
  ├── 1. Upload DOM Snapshots (Large JSON/Assets) ──► Cloudflare R2 (S3 API)
  └── 2. Save Step Draft Metadata ─────────────────► Cloud Firestore (Private)
                                                           │
                                                           ▼
                                                  Author Studio (packages/client at /admin)
                                                   ├── Visual Annotation Canvas
                                                   ├── Interactive Hotspot Positioning
                                                   └── Click "Publish to Edge"
                                                           │
                                                           ▼ (Exports Static Bundle)
                                                  Cloudflare R2 Bucket
                                                   └── /demos/{id}/manifest.json
                                                           │
                                                           ▼ (100% CDN Edge Cached)
                                                  Public Viewer (/view/:id & /)
                                                   └── Zero DB Reads / $0 Egress
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Client (Landing Page, Studio & Player)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the Public Showcase, or [http://localhost:3000/admin](http://localhost:3000/admin) for the Creator Studio.

### 3. Build Chrome Extension
```bash
npm run build:ext
```
Load `packages/ext-tour/dist` as an unpacked extension in `chrome://extensions/`.

---

## 🌐 Deploy to Netlify ($0/mo Hosting)

1. Connect your repository to **Netlify**.
2. Netlify will automatically detect `netlify.toml`:
   - **Build command:** `npm run build:client`
   - **Publish directory:** `packages/client/dist`
3. In **Netlify Site Settings** > **Environment variables**, configure:
   - `VITE_SUPER_ADMIN_EMAILS`: Comma-separated list of admin emails (e.g. `you@domain.com`).
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc.
   - `VITE_R2_ACCOUNT_ID`, `VITE_R2_ACCESS_KEY_ID`, `VITE_R2_SECRET_ACCESS_KEY`, `VITE_R2_PUBLIC_URL`.
4. Deploy! Your interactive demo platform and public showcase will be live with instant global edge caching.

---

## 📜 License
MIT License

---
name: edge-deployment
description: >-
  Procedures for Cloudflare R2 Edge storage, Firebase Cloud Functions deployment, and Netlify CI/CD builds.
  Use when deploying functions, updating build commands, or inspecting static TourManifest edge bundles.
---

# Edge Deployment & Cloudflare R2 Skill

This skill outlines how to build, deploy, and verify serverless zero-database assets.

---

## Core Operations

1. **Manifest Edge Compilation**:
   * Publishing a guide packages all step definitions and DOM modifications into a static `manifest.json`.
   * Manifests are stored in R2 at `/demos/{demoId}/manifest.json`.
   * For schema specifications, see: [r2-manifest-spec.md](./references/r2-manifest-spec.md)

2. **Deploying Cloud Functions**:
   * Deploy server-side functions using the Firebase CLI.
   * For step-by-step commands and environment configuration, see: [deployment-playbook.md](./references/deployment-playbook.md)

3. **Netlify Web Application Build**:
   * Build command: `npm run build:client`
   * Publish directory: `packages/client/dist`

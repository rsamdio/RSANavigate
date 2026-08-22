# Sub-Agent: Edge Operations (`edge-ops`)

## Role & Domain
Specialist for Cloudflare R2 static edge manifest generation, Firebase Cloud Functions deployment, and Netlify CI/CD.

## Target Files
* `packages/functions/src/index.ts`
* `packages/common/src/storage/r2Client.ts`
* `packages/client/src/services/demoService.ts`
* `firebase.json`
* `netlify.toml`

## Primary Responsibilities
1. Ensure the Zero-Database Public Player invariant is strictly preserved (100% static JSON reads from Cloudflare R2 CDN).
2. Maintain server-side Cloud Function secrets without exposing `R2_SECRET_ACCESS_KEY` to client browser bundles.
3. Manage deployment commands, monorepo build scripts, and Netlify single-page application rewrites.

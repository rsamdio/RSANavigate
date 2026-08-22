# Deployment & CLI Playbook

## 1. Firebase Functions & Firestore Rules Deployment
```bash
# Set Cloudflare R2 server-side secrets
firebase functions:config:set \
  r2.account_id="YOUR_ACCOUNT_ID" \
  r2.access_key_id="YOUR_ACCESS_KEY" \
  r2.secret_access_key="YOUR_SECRET_KEY" \
  r2.bucket_name="interactive-demos" \
  r2.public_url="https://pub-xxx.r2.dev" \
  app.super_admin_emails="admin@demo-platform.local,your-email@gmail.com"

# Deploy Functions and Security Rules
firebase deploy --only firestore:rules,functions
```

## 2. Monorepo Build Verification
```bash
# Build all workspaces
npm run build

# Individual workspace builds
npm run build:client
npm run build:ext
npm run build --workspace=@serverless-tour/functions
```

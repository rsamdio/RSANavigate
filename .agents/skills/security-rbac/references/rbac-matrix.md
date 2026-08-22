# RBAC Permissions Matrix

| Resource / Action | Public Viewer | Pending User | Creator | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Browse Public Guides (`/`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Play Interactive Tour (`/view/:id`)** | ✅ Allowed (Static Edge) | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Access Studio Dashboard (`/admin`)** | ❌ Blocked | ⏳ Pending Screen | ✅ Allowed | ✅ Allowed |
| **Create & Edit Walkthroughs** | ❌ Blocked | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| **Generate R2 Presigned Upload URL** | ❌ Blocked | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| **Publish Static Manifest to R2** | ❌ Blocked | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| **Approve / Reject Creators** | ❌ Blocked | ❌ Blocked | ❌ Blocked | ✅ Allowed |

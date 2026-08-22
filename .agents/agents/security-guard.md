# Sub-Agent: Security & RBAC Guard (`security-guard`)

## Role & Domain
Specialist for Firebase Authentication, Role-Based Access Control, and Firestore Security Rules.

## Target Files
* `packages/client/src/services/firebase.ts`
* `packages/client/src/components/admin/AdminProtectedRoute.tsx`
* `packages/client/src/components/admin/AdminUserManagementModal.tsx`
* `packages/functions/src/index.ts`
* `firestore.rules`

## Primary Responsibilities
1. Protect the `/admin` Studio route by verifying `super_admin` and `creator` roles.
2. Enforce server-side authorization in Cloud Functions (`setUserRole`, `publishTourManifest`, `getPresignedUploadUrl`).
3. Maintain production security rules in `firestore.rules` preventing unauthorized writes.

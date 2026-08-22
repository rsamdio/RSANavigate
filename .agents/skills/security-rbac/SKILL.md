---
name: security-rbac
description: >-
  Procedures for Firebase Authentication, Role-Based Access Control (RBAC), and Firestore Security Rules.
  Use when configuring Super Admin roles, approved creators, or modifying firestore.rules.
---

# Security & RBAC Skill

This skill outlines how role-based permissions and data protection rules are enforced across NAVIGATE Studio.

---

## Role Definitions

1. **`super_admin`**: Full master control. Can create/publish guides, manage users, and approve creator requests.
2. **`creator`**: Approved author. Can create, edit, test, and publish guides.
3. **`pending`**: Registered user awaiting Super Admin approval. Blocked by `AdminProtectedRoute`.
4. **`public`**: Unauthenticated viewer. Can only read static edge manifests from R2.

For the detailed permissions matrix, see: [rbac-matrix.md](./references/rbac-matrix.md)

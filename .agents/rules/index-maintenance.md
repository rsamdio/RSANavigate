# Continuous Codebase Index Maintenance Rule

## Purpose & Scope
This rule enforces strict, real-time synchronization between the repository's file structure and [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/INDEX.md). Keeping the index up to date eliminates hallucinated paths, speeds up agent comprehension, and ensures all sub-agents and developers have an accurate symbol map.

---

## Mandatory Invariants

### 1. Zero Index Drift on Code Modifications
* Whenever any change is made to the codebase that:
  * Adds, renames, moves, or deletes any file or directory.
  * Adds or modifies exported interfaces, types, services, endpoints, or UI components.
  * Adds or updates scripts in `scripts/` or root configuration files.
  * Adds or updates `.agents/` rules, skills, agents, or memory files.
* You **MUST** update [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/INDEX.md) in the **exact same turn/task** before concluding your work.

### 2. Build & Verification Enforcement
* Every build, harness verification, or update check (`npm run verify`, `npm run build`) runs automated index consistency checks via [`scripts/harness-verify.js`](file:///Users/zeospec/Dev/Code/RSANavigate/scripts/harness-verify.js).
* If any source or configuration file is missing from [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/INDEX.md), the harness verification **fails immediately**.

### 3. Formatting & Link Standards
* All entries in [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/INDEX.md) must use absolute file URI markdown links (e.g. `[filename](file:///Users/zeospec/Dev/Code/RSANavigate/...)`).
* Each entry must include a clear, concise description of:
  * The file's role and architectural boundary.
  * Primary exported functions, components, interfaces, or endpoints.
  * Any critical caveats, dependencies, or security boundary notes.

### 4. No Stale / Orphaned References
* When deleting or refactoring files, never leave stale links or outdated symbol names in [`.agents/INDEX.md`](file:///Users/zeospec/Dev/Code/RSANavigate/.agents/INDEX.md). Clean them up immediately.

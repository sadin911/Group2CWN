---
name: reactive-pwa-guidance
description: Architecture standards, quality guardrails, and development workflows for reactive PWA applications. Covers offline-first state management, localization priority, atomic release protocols, and automated test-driven verification.
---

# Reactive PWA Guidance (`reactive-pwa-guidance`)

Reference manual and engineering standards for building, debugging, and maintaining modern, reactive Progressive Web Applications (PWAs) with high-frequency state updates, offline-first reliability, and strict release guardrails.

---

## 1. Architectural Foundations

### 1.1 Reactive & Isolated State Design
- **Sliced State Architecture**: Partition stores (e.g. Zustand) by lifecycle—separate transient view/match state from persistent user preferences and remote cache.
- **Cloud-Write Guarding**: Gate remote sync behind validation layers to prevent write loops, respect cloud quotas, and gracefully handle offline queueing.
- **Render Optimization**: Protect high-frequency controls (counters, gestures, canvas/render loops) from heavy re-renders via selective selectors and memoized subscriptions.

### 1.2 Multi-Language Priority Fallbacks
In localized applications, never allow missing translations to display raw keys or fall back to an unexpected language before checking regional keys:
```typescript
// ✅ Robust localization resolution
const displayName = item.nameLocal || item.name || getItemDisplayName(item);
const actionLabel = action.nameLocal || getActionDisplayName(action) || action.name;
```

---

## 2. Mandatory Quality & Testing Guardrails

### 2.1 Evidence Before Assertions (Automated Verification Only)
- **Zero Manual Screenshots**: Do not take, capture, or manually review screenshots to evaluate UI states or functionality.
- **Automated Verification Pipeline**:
  1. **Unit & Store Testing**: Validate reducer/store integrity and cloud-guarding boundaries (`npm test` / Vitest).
  2. **End-to-End Testing**: Validate critical user journeys, interactions, and responsive layouts via headless automation (`npx playwright test`).
  3. **Static Analysis & Builds**: Ensure zero-lint and zero-type error policy (`npm run lint && npm run build`).

### 2.2 Shared Action Logging (`AI_LOG.md`)
Maintain a unified, cross-assistant log (`AI_LOG.md`) at project root:
- **Format**: `[YYYY-MM-DD HH:MM] LEVEL | AGENT | TOOL | description`
- **Levels**:
  - `Major`: File writes, code refactors, migrations, production releases.
  - `Minor`: File reads, repo inspections, keyword searches.
- **Atomic Commits**: Always bundle `AI_LOG.md` into the same commit as the code changes. Never commit `AI_LOG.md` independently to avoid polluting history and triggering redundant CI builds.

---

## 3. Intelligent Dev & Release Protocols

### 3.1 Feature Implementation Workflow
1. **Analyze Dependency Graph**: Trace state mutations through store slices to network/cache layers before modifying UI components.
2. **Implement with Automated Tests**: Pair every new view, modal, or workflow with automated E2E test cases (`e2e/*.spec.ts`).
3. **Audit Static Bundle**: Ensure new dependencies do not break PWA caching strategies or bundle limits.

### 3.2 Production Release & Tagging Checklist
Before merging to `main` or deploying live:
```bash
# 1. Bump version in package.json (SemVer: x.y.z)
# 2. Run the 4-step quality gate (must pass with 0 errors)
npm run lint
npm run build
npm test
npx playwright test

# 3. Record release entry in AI_LOG.md
# [YYYY-MM-DD HH:MM] Major | <Agent> | Release | vX.Y.Z - <summary>

# 4. Atomic Commit & Annotated Git Tag
git add -A
git commit -m "chore(release): vX.Y.Z - <summary>"
git tag -a vX.Y.Z -m "Release vX.Y.Z - <summary>"

# 5. Push both code and tags simultaneously
git push origin main --tags
```

---

## 4. Common Pitfalls & Solutions

| Pitfall / Issue | Root Cause | Recommended Fix |
| :--- | :--- | :--- |
| **State out of sync after offline reload** | PWA service worker serving stale assets while store expects new schema | Use proper cache invalidation in PWA plugin config; test locally with `npm run preview`. |
| **Excessive cloud write costs** | Unthrottled store subscriptions firing mutations on every tick/touch | Debounce updates and batch changes through cloud guards before flushing to backend. |
| **Broken CI/CD runs on tag push** | Tag and commit pushed separately, triggering detached builds | Push commit and tags together using `git push origin <branch> --tags`. |
| **Localized labels reverting to default** | Direct property access bypassing localization fallback helper | Apply the localized fallback chain (`item.nameLocal || item.name`). |


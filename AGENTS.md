# Cross-Agent Repository Rules & Guidelines

This document applies to **all AI coding assistants** working on this repository, including **Antigravity IDE, Claude Code, Gemini CLI, GitHub Copilot, and Cursor**.

---

## 1. Mandatory Version Bump & Git Tag on Deploy (CRITICAL)

Whenever taking changes live, merging to `main`, or triggering a production deployment:

1. **Synchronize Version Numbers**:
   - Update `"version"` in [`package.json`](file:///Users/sadin/Project/PokeCountTracker/package.json) (SemVer: `x.y.z`).
   - Update version constants in code if applicable.
2. **Quality Gate Verification Before Tagging**:
   - Run linter and typecheck: `npm run lint`
   - Run production build: `npm run build`
   - Run E2E tests: `npx playwright test`
   - Ensure all checks pass with 0 errors before tagging.
3. **Log in AI_LOG.md Before Committing**:
   - Record the release entry in [`AI_LOG.md`](file:///Users/sadin/Project/PokeCountTracker/AI_LOG.md) BEFORE running `git commit`.
4. **Single Atomic Commit (CRITICAL - NO SEPARATE AI_LOG COMMITS)**:
   - Stage all code changes, `package.json`, and `AI_LOG.md` together:
     ```bash
     git add -A
     git commit -m "chore(release): vX.Y.Z - <short description>"
     ```
   - **STRICTLY FORBIDDEN**: Never create a standalone commit solely for `AI_LOG.md`. Doing so pollutes git history and triggers redundant CI/CD build minutes.
5. **Git Tagging & Push**:
   - Create an annotated git tag matching the version format `vX.Y.Z`:
     ```bash
     git tag -a vX.Y.Z -m "Release vX.Y.Z - <short description>"
     ```
   - Push both commits and tags to remote in one go:
     ```bash
     git push origin main --tags
     ```

---

## 2. Shared Action Log (`AI_LOG.md`)

Every agent MUST maintain [`AI_LOG.md`](file:///Users/sadin/Project/PokeCountTracker/AI_LOG.md) in the project root.

### Format
```text
[YYYY-MM-DD HH:MM] LEVEL | AGENT | TOOL | description
```

### Rules
- One line per action, UTF-8, append-only (never overwrite or truncate).
- Log every Major action immediately after it completes.
- **Atomic Commits Only**: Always bundle `AI_LOG.md` changes into the same commit as the corresponding code or release changes. Never push `AI_LOG.md` as an isolated secondary commit.

---

## 3. Cloudflare Deployment Architecture (Workers Static Assets via wrangler.jsonc)

- This repository is connected to Cloudflare CI (Workers Builds).
- Cloudflare CI runs `npm run build` followed by `npx wrangler deploy`.
- **CRITICAL**: Keep `wrangler.jsonc` configured with `"assets": { "directory": "./dist", "not_found_handling": "single-page-application" }`.
- Do NOT delete `wrangler.jsonc`, as Cloudflare Workers Builds requires it to serve the static SPA and prevents Wrangler from launching interactive setup / npm installs during deployment.

---

## 4. Testing Policy: Automated E2E Only (Strictly No Manual Screenshot Verification)

Whenever verifying frontend features, bug fixes, or user flows:
1. **No Manual Screenshots**: Do NOT take, capture, or view screenshots to test or inspect page states visually.
2. **Automated E2E Testing Only**: All visual and functional verification MUST be conducted via Playwright automated E2E tests (`npx playwright test`) and Vitest unit tests (`npm test`).
3. **Write E2E Tests for New Features**: For every new UI flow, catalog, or interactive modal, add corresponding automated test cases under `e2e/*.spec.ts` with explicit locators and assertions.

---

## 5. Thai Language Priority for UI Display (Mandatory Rule)

Whenever displaying text in user-facing UI (Cards, Modals, Action Sheets, Combat Banners, Toasts, History Logs, and Tooltips):
1. **Pokémon Names**: ALWAYS prioritize Thai: `card.nameTh || card.name || getCardDisplayName(card)`. NEVER default to `nameEn` first.
2. **Attack Names**: ALWAYS display in Thai (`att.nameTh || getAttackDisplayName(att) || att.name`).
3. **Ability Names**: ALWAYS display in Thai (`ability.nameTh || getAbilityDisplayName(ability) || ability.name`).
4. **Log & Message Consistency**: All game history entries and action toasts must use Thai card and action names (e.g. `ใช้ท่า [ชื่อภาษาไทย]`, `ความสามารถ [ชื่อภาษาไทย]`).
5. **Bilingual Detail Fallbacks**: English names may only appear as secondary labels in bilingual inspect views, never as the primary title when Thai exists.


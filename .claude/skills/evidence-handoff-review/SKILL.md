---
name: evidence-handoff-review
description: Use when reviewing a branch, diff, or another agent's unfinished work (Gemini, Cursor, Antigravity) and the result must be packaged as a handoff report. Also use when asked to audit gaps between two repos, verify claims another agent made about its own work, or produce a code review backed by real command output rather than assertions.
---

# Evidence-Based Handoff Review

## Overview

Reviews that assert quality are worthless to the next agent. A handoff report is only
useful if every claim in it is backed by a command that was actually run and whose output
is quoted.

**No claim without a command. No "should work".**

## When to Use

- Picking up work another AI left unfinished
- Auditing feature parity between two repos
- Producing a review a different agent will act on
- Verifying that a branch is safe to merge

## Workflow

1. **Establish the baseline.** `git log`, `git diff --stat` against the merge base. Know
   exactly what changed before forming an opinion.
2. **Run the gates and capture real output:**
   ```bash
   npm run lint
   npm run build      # tsc -b && vite build
   npm test
   npx playwright test
   ```
   Record exit codes and counts. A gate you skipped is reported as skipped.
3. **Review only changed files.** Cite `file:line` for every finding.
4. **Separate three buckets — never blur them:**
   - **Verified** — a command proved it
   - **Suspected** — reasoned from reading code, not yet proven
   - **Out of scope** — noticed, deliberately not addressed
5. **Check the project's own rules** the reviewed code must obey:
   - Thai-first display: `card.nameTh || card.name || getCardDisplayName(card)`,
     `att.nameTh || getAttackDisplayName(att)`, `ability.nameTh || getAbilityDisplayName(ability)`
   - No placeholder comments, `// TODO` stubs, or pseudo-code
   - Mobile viewport 360–430px: no clipping, overlap, or horizontal overflow
   - Existing features, types, and visual effects preserved unless removal was requested
6. **Write the report to a file**, not a chat artifact:
   `reports/review-YYYY-MM-DD.html` in the repo. Self-contained HTML, no external assets.

## Report Sections

1. Scope reviewed (branch, commit range, file count)
2. Gate results table — command, exit code, key output
3. Verified findings, severity-ordered, each with `file:line`
4. Suspected issues, marked as unproven
5. Prioritized action list for the receiving agent
6. What was NOT verified, and why

## Rules

- Do not open a browser or take screenshots. Use Playwright specs, logs, and command output.
- Do not fix things while reviewing unless asked — the review is the deliverable.
- If a gate fails, that is the headline finding, not a footnote.

## Red Flags — Stop

- "Tests should pass" without having run them
- A finding with no file/line
- Verified and suspected findings in the same list
- The report published as an artifact instead of saved in `reports/`

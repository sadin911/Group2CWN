---
name: deliverable-verification
description: Use at the end of every task before saying done, finished, complete, or working — and when producing any generated report, dashboard, CSV, or analysis output that needs a home on disk. Also use when handing work to another agent (Gemini, Cursor, Antigravity) or when a previous session trailed off without a confirmed deliverable.
---

# Deliverable & Verification

## Overview

Sessions have ended with the deliverable never confirmed to exist, and generated reports
have landed as chat artifacts instead of files next to their source data. Both force a
re-ask.

**"Done" means a file exists at a path and a command exited 0. Nothing else counts.**

## Where Output Goes

- Save generated HTML reports, dashboards, and CSVs **into the same folder as the source
  data file** (next to the `.xlsx`/`.csv` being analyzed).
- Never publish output as a chat artifact unless the user explicitly asked for one.
- Temp/scratch work goes in the scratchpad directory, never in the repo.

## Closing Block — Required

End every task with this section. Do not write "done" without it.

```markdown
## Verification

**Files written**
- /absolute/path/to/file  — what changed

**Commands run**
- `npm run lint`   → exit 0
- `npm run build`  → exit 0
- `npm test`       → exit 0, 42 passed
- `npx playwright test` → exit 0, 11 passed

**Not verified**
- <what, and why — e.g. iOS run blocked on CocoaPods>

**Handoff**
- Remaining work for the next agent, as a short list
```

Paste real exit codes and real counts. A command you did not run does not appear in the
block.

## Verification Method

- Verify with Vitest, Playwright, curl, node scripts, and log inspection.
- **Do not open a browser or take screenshots to verify UI.** Add or extend an `e2e/` spec
  instead — that is the project rule and it is also cheaper.
- A claim without a command behind it goes under **Not verified**, not under a confident
  sentence.

## Red Flags — Stop

- "Should work" / "this will fix it" / "looks correct"
- Reporting a test suite as passing without its output in context
- Saying done while one part of the scope is quietly unfinished
- Publishing an analysis as an artifact when the user asked for a file

## Rule

If a part of the scope is blocked, finish everything else in full and name the blocked
part explicitly under **Not verified**. Silently narrowing scope is worse than saying
what was left out.

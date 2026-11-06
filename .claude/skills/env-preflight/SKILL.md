---
name: env-preflight
description: Use BEFORE writing code for any task that must be built, run, or deployed on a local toolchain — iOS/React Native builds, native mobile ports, dev server work, Playwright runs, kubectl/Rancher operations, or any first build in an unfamiliar environment. Also use when a build succeeds but the run step fails on Xcode, CocoaPods, Ruby, node version, a port that will not bind, or a simulator stuck booting.
---

# Environment Preflight

## Overview

Sessions have died *after* the code was written: Xcode CLI tools pointed at the wrong
path, Ruby 4.0 incompatible with CocoaPods, a simulator stuck in `Booting`, a Vite server
that would not bind because the working directory drifted. The code was fine; the session
ended unverified.

**Probe the toolchain before you write the first line. It costs five minutes and it is
the only thing that makes "done" mean "verified".**

## When to Use

Run preflight first for: native mobile builds, a port to a new platform, the first build
in this environment, anything involving simulators/emulators, kubectl or cluster work, or
a dev server you will need to reach.

Skip for pure TypeScript edits verified by `npm test` / `npm run build` alone.

## Probe, Then Stop

Run read-only probes, report a table, and **stop for approval before writing code** if any
row is `FAIL`.

| dependency | required | found | status | fix command |

Probe at minimum what the task actually needs:

```bash
node -v && npm -v
xcode-select -p && xcodebuild -version
ruby -v && (pod --version || echo "cocoapods: MISSING")
xcrun simctl list devices | grep -E "Booted|Booting"
kubectl config current-context && kubectl get nodes
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(5173|4173|3000)' || echo "dev ports free"
pwd   # confirm cwd is the repo root before starting any server
```

Cross-reference the found versions against what the repo *declares* — `package.json`
engines, `Podfile`, `.tool-versions`, `.nvmrc`, CI workflow files. A version that merely
"exists" is not a pass.

## Rules

- **Always run from an absolute path derived from the repo root.** Never assume the cwd
  survived a previous command. This is the dev-server-won't-bind failure.
- **Never start a dev server with Bash.** Use the Browser pane's `preview_start` with the
  `.claude/launch.json` entry.
- **A simulator stuck in `Booting` is a FAIL, not a wait.** Report it with the reset
  command; do not loop on retries.
- **Fixes needing sudo or a password are the user's to run.** Print the exact command and
  stop — do not attempt them.

## Red Flags — Stop

- "I'll build first and deal with the environment if it breaks"
- "The toolchain worked last session"
- Retrying the same failing command more than twice
- Declaring a port/build task done without ever having run it

## Done Means

Every probe row is `PASS`, or the `FAIL` rows were reported to the user with exact fix
commands before any code was written.

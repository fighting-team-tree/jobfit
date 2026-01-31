---
name: jobfit-refactor-bugfix
description: Refactor and debug JobFit with minimal risk, clear repro steps, and verification using lint/build.
compatibility: opencode
metadata:
  focus: refactor-debug
  workspace: jobfit
---
## What I do
- Identify repro steps and scope before changing code
- Keep diffs small; avoid behavior changes unless required
- Fix root cause first; add guards only if necessary
- Run `npm run lint` and `npm run build` after frontend refactor/bugfix changes
- Run relevant backend checks with `uv` after backend refactor/bugfix changes
- Prefer running targeted tests or scripts when available
- Prioritize the antigravity IDE workflow for main implementation work

## When to use me
Use this skill for refactoring, bug investigation, and bug fixes across JobFit.

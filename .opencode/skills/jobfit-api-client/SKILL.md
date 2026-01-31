---
name: jobfit-api-client
description: Keep JobFit client API types and calls aligned with FastAPI endpoints and responses.
compatibility: opencode
metadata:
  stack: typescript
  workspace: jobfit
---
## What I do
- Update `client/src/lib/api.ts` types and request shapes
- Align payloads and query params with backend endpoints
- Validate response types to prevent runtime mismatch
- For refactors/bugfixes, update types first to avoid drift
- After API refactor/bugfix changes, run `npm run lint` and `npm run build`
- Prioritize the antigravity IDE workflow for main implementation work

## When to use me
Use this skill when adding or modifying API calls, or when frontend types must match backend responses.

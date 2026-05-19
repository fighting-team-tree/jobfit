---
name: frontend-product-review
description: Review JobFit frontend and product experience across React/Vite screens, upload/JD/analyze flows, result interpretation, loading/error/empty states, trust wording, accessibility basics, and API-state handling. Use when analyzing UI quality, demo readiness, user journey clarity, or frontend changes that affect how users understand AI results.
---

# Frontend Product Review Skill - JobFit

Use this skill to review whether the UI helps users complete the JobFit flow and correctly understand AI-generated results.

## Review Routine

1. Inspect the implemented UI, not only design intent.
   - `client/src/App.*`, pages/components, Zustand stores, TanStack Query calls, API clients.
2. Walk the primary user journey.
   - Login/session state.
   - Resume upload or profile input.
   - JD URL/text input.
   - Analysis progress and failure recovery.
   - Gap result interpretation.
   - Roadmap/interview/problem follow-ups.
3. Review state quality.
   - Loading, retry, error, empty, partial-success, and expired-session states.
   - Avoid stale analysis after profile/JD changes.
   - No sensitive data persisted unnecessarily.
   - Clear user feedback for provider/scraping failures.
4. Review product trust.
   - Separate extracted evidence from AI recommendation.
   - Avoid overconfident employment or capability claims.
   - Explain score and missing-skill logic enough for a user to act.
   - Keep hackathon/demo wording out of product-like screens unless explicitly required.
5. Check implementation basics.
   - TypeScript types match API contracts.
   - Components have clear responsibility boundaries.
   - Keyboard/accessibility basics for upload, modals, buttons, charts, and editor widgets.

## Output Format

```text
Screens/flows inspected:
- ...

UX strengths:
- ...

Product issues:
- [Blocking] ...
- [Confusing] ...
- [Polish] ...

Recommended UI/content changes:
1. ...

Validation suggested:
- npm --prefix client run lint
- npm --prefix client run build
- Optional browser smoke path: ...
```

Prioritize comprehension, trust, and recovery over cosmetic polish.

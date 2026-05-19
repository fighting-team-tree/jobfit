---
name: test-qa-review
description: Review JobFit test and QA strategy, including pytest coverage, API contract tests, frontend lint/build, AI-provider mocks, scraping fallback tests, auth/session regressions, security/PII tests, smoke tests, and CI readiness. Use when assessing quality gates, adding tests, debugging fragile tests, or preparing release/demo validation.
---

# Test QA Review Skill - JobFit

Use this skill to evaluate whether JobFit's validation suite catches the risks that matter for the product.

## Review Routine

1. Inventory current gates.
   - Python: `make lint`, `make test`, `uv run ruff ...`, `uv run pytest`.
   - Frontend: `npm --prefix client run lint`, `npm --prefix client run build`.
   - Commit/security checks: hooks, scripts, docs, smoke tests if present.
2. Map tests to risk areas.
   - Resume parsing and file handling.
   - JD scraping and SSRF/timeout behavior.
   - Gap analysis scoring and schema validation.
   - Roadmap/interview generation with provider mocks.
   - Auth/session/browser storage behavior.
   - PII masking and log/cache safety.
   - API contract compatibility with frontend expectations.
3. Identify missing layers.
   - Unit tests for deterministic logic.
   - Integration tests for FastAPI endpoints with mocked providers.
   - Fixture tests for AI JSON parsing/fallbacks.
   - Frontend component or smoke tests for critical flows.
   - Regression tests for previously fixed bugs.
4. Recommend the smallest useful gate first.
   - Prefer fast deterministic tests before live-provider or full E2E tests.
   - Mock external APIs by default.
   - Keep secrets and real resume data out of fixtures.

## Output Format

```text
Current validation:
- ...

Coverage strengths:
- ...

QA gaps:
- [High] ...
- [Medium] ...
- [Low] ...

Suggested next tests:
1. ...

Commands to run:
- ...
```

When source files change, report the exact validation commands run and any failures. For review-only tasks, clearly label unrun commands as recommendations.

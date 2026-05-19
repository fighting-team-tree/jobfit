---
name: architecture-review
description: Review JobFit's system architecture, module boundaries, data flows, deployment shape, and service-readiness tradeoffs. Use when analyzing backend/frontend/AI/DB/Auth/Scraping integration, deciding refactors, checking whether the current design is demo-only or production-ready, or preparing architecture recommendations.
---

# Architecture Review Skill - JobFit

Use this skill to review JobFit as a whole system, not just individual files.

## Review Routine

1. Build the current map from source files before judging.
   - Backend: `server/main.py`, `server/app/api/`, `server/app/services/`, `server/app/models/`, `server/app/core/`.
   - Frontend: `client/src/`, route structure, API client calls, Zustand stores, TanStack Query usage.
   - Persistence/deployment: `pyproject.toml`, `docker-compose.yml`, `replit.nix`, `.env.example`, docs.
2. Trace the user-facing flows end to end.
   - Resume upload/parsing.
   - JD URL scraping/extraction.
   - Gap analysis and roadmap generation.
   - Interview practice and voice/session flows.
   - Auth, GitHub connection, profile/company state.
3. Identify architecture risks by boundary.
   - API contract drift between TypeScript and Pydantic models.
   - Business logic living in UI or endpoint handlers instead of services.
   - Shared mutable in-memory state that affects users, sessions, or tests.
   - External provider coupling without adapter boundaries or fallbacks.
   - Demo-only persistence that is not clearly marked as such.
4. Separate findings into three levels.
   - `Now`: correctness, security, data-loss, or demo-breaking risks.
   - `Next`: refactors that improve maintainability or service readiness.
   - `Later`: scale, observability, infra, and enterprise concerns.

## JobFit-Specific Architecture Questions

- Is PII masked before every LLM or external API boundary?
- Does URL scraping preserve SSRF defenses and timeout limits?
- Are AI outputs represented by typed schemas with validation/fallbacks?
- Are frontend result states derived from API contracts rather than duplicated assumptions?
- Are demo fallback stores isolated, bounded, and clearly non-production?
- Are auth/session boundaries explicit between browser storage, API headers, and backend state?

## Output Format

Return a concise review with:

```text
Scope inspected:
- ...

Architecture strengths:
- ...

Risks:
- [Now] ...
- [Next] ...
- [Later] ...

Recommended changes:
1. ...

Validation evidence / missing evidence:
- ...
```

Do not recommend large rewrites unless the source evidence shows that smaller boundary fixes are insufficient.

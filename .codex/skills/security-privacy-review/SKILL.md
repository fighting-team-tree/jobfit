---
name: security-privacy-review
description: Review JobFit security and privacy risks, including resume PII handling, LLM/API data boundaries, JWT/OAuth/API key safety, browser storage, logs, SSRF defenses for JD scraping, and production-vs-demo safeguards. Use for security audits, privacy checks, sensitive data changes, external-provider integration, or release readiness reviews.
---

# Security Privacy Review Skill - JobFit

Use this skill whenever JobFit handles resumes, user profiles, job descriptions, tokens, external URLs, or third-party AI/voice/GitHub services.

## Review Routine

1. Inspect the actual data path before making claims.
   - Upload/input -> backend endpoint -> service -> external provider -> response -> storage/logs/UI.
2. Classify data.
   - PII: name, email, phone, address, resume text, interview content, GitHub identity when tied to a user.
   - Secrets: API keys, JWT secrets, OAuth tokens, GitHub PATs, provider credentials.
   - Derived sensitive data: skill gaps, interview feedback, company/job preferences.
3. Check mandatory boundaries.
   - PII masking before LLM/external API calls.
   - No raw PII or secrets in logs, browser persistent storage, cache keys, error messages, or test fixtures.
   - URL scraping has SSRF controls, scheme/host validation, redirect policy, timeouts, and private-network blocking.
   - Demo fallback stores are session-scoped, bounded, and disabled or replaced in production.
   - JWT/auth handling avoids long-lived browser exposure when possible.
4. Verify configuration hygiene.
   - `.env` remains local-only.
   - `.env.example` documents names without real values.
   - Provider keys are read from environment/settings, not hard-coded.

## High-Risk JobFit Areas

- Resume parsing and gap-analysis prompts.
- Interview question/feedback generation and voice transcripts.
- JD scraping from arbitrary URLs.
- GitHub connection and token/config storage.
- Frontend local/session storage.
- Caches, in-memory stores, and test snapshots.

## Output Format

```text
Scope inspected:
- ...

Critical findings:
- ...

Privacy/security risks:
- [High] ...
- [Medium] ...
- [Low] ...

Required fixes before release:
1. ...

Evidence checked:
- ...

Not checked:
- ...
```

If evidence is missing, say so directly instead of assuming the project is safe.

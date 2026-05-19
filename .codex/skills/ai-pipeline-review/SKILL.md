---
name: ai-pipeline-review
description: Review JobFit AI pipelines for resume parsing, JD extraction, gap analysis, roadmap generation, interview questions/feedback, skill matching, prompts, schemas, fallbacks, evaluation quality, hallucination controls, and provider abstraction. Use when analyzing AI correctness, reliability, model/provider changes, prompt changes, or user-facing analysis quality.
---

# AI Pipeline Review Skill - JobFit

Use this skill to judge whether JobFit's AI outputs are reliable, validated, explainable, and safe enough for users to act on.

## Review Routine

1. Trace each AI pipeline from input to UI.
   - Resume file/text -> parser -> normalized profile.
   - JD URL/text -> scraper/extractor -> requirements.
   - Profile + JD -> gap analysis -> score/missing skills.
   - Gaps -> roadmap/problems/interview questions.
   - Interview transcript/context -> feedback.
2. Inspect prompt and schema boundaries.
   - PII masking before provider calls.
   - Typed request/response models with validation.
   - JSON parsing and repair/fallback behavior.
   - Provider-specific assumptions hidden behind stable service interfaces.
3. Check quality controls.
   - Deterministic scoring rules where possible.
   - Required vs preferred requirements weighted transparently.
   - Evidence snippets or traceability from resume/JD to claims.
   - Handling for empty, malformed, low-confidence, or multilingual inputs.
   - Tests using mocks/fixtures instead of live provider calls.
4. Identify hallucination and overclaim risks.
   - Skills inferred without source evidence.
   - Roadmaps that imply guarantees.
   - Interview feedback that sounds diagnostic or overly authoritative.
   - Hidden provider failures presented as successful analysis.

## JobFit AI Review Checklist

- Are resume/JD schemas stable and versionable?
- Does the UI distinguish extracted facts from generated recommendations?
- Are confidence/limitations visible when parsing or matching is uncertain?
- Can provider errors degrade gracefully without corrupting user state?
- Are prompts and tests updated together when output schemas change?

## Output Format

```text
Pipelines inspected:
- ...

Strengths:
- ...

AI quality risks:
- [Correctness] ...
- [Reliability] ...
- [Safety/Privacy] ...
- [UX Trust] ...

Recommended improvements:
1. ...

Evaluation gaps:
- ...
```

Prefer measurable checks and fixture-based evaluation suggestions over vague model-quality advice.

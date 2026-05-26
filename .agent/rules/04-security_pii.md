# Security & PII Rules

## 1. PII Masking Required
- **BEFORE** sending any resume text or user data to an LLM (OpenAI, NVIDIA NIM, etc.), all Personally Identifiable Information (PII) must be masked.
- **Targets:**
  - Email Addresses
  - Phone Numbers
  - Resident Registration Numbers (if applicable)
  - Home Addresses (optional but recommended)

## 2. Implementation Strategy
- Use Regex-based masking for performance and reliability.
- **Do not** rely on LLMs to self-censor PII.
- Masking format examples:
  - Email: `j***@gmail.com` -> `[EMAIL_REDACTED]`
  - Phone: `010-1234-5678` -> `[PHONE_REDACTED]`

## 3. Data Handling
- Do not store unmasked PII in logs.
- Resume files processed in background tasks should be cleaned immediately after text extraction.

## 4. Environment Variables (.env) Handling & Resolution
- **Do not read/access:** AI agents must not view, open, or read the real `.env` file directly under any circumstances to prevent credential leaks.
- **Drift/Discrepancy Resolution:**
  - If a discrepancy is suspected between `.env` and `.env.example` (e.g., config error, missing key), the agent must inspect `config.py` against `.env.example` to identify missing variables.
  - The agent must report the list of missing variable names to the user and prompt the user to manually add/update them in `.env`. The agent must never write to or read from the `.env` file directly.

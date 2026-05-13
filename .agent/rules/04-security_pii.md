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

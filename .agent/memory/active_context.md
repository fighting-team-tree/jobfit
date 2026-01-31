## Current Status
- **Phase:** Implementation - NVIDIA Model Testing
- **Goal:** Testing and verifying NVIDIA NIM (Nemotron-Parse) API for resume parsing.

## Recent Actions
- **Git & Collaboration:**
  - Created `test/nvidia-model` branch for experimental testing of NVIDIA VLM models.
  - Synchronized `dev` branch with `main`.
  - Defined Git Commit Convention and Branch Strategy.
- **Structure:**
  - Created Domain-Driven folder structure for Server (`endpoints`, `services`, `schemas`).
  - Created Feature-Based folder structure for Client (`features`, `hooks`, `store`).
  - Implemented `server/main.py` with CORS and Basic Router.

## Next Steps
- Create an experimental script to call NVIDIA NIM Nemotron-Parse 1.1 API.
- Test with sample resume images/PDFs.
- Evaluate parsing accuracy and latency.
- Implement PII masking logic in the test script.

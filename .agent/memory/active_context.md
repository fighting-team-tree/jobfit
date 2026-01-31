## Current Status
- **Phase:** Implementation - NVIDIA Model Testing
- **Goal:** Testing and verifying NVIDIA NIM (Nemotron-Parse) API for resume parsing.

## Recent Actions
- **NVIDIA Model Testing:**
  - Corrected `tests/test_nvidia_parse.py` payload structure based on official NVIDIA documentation.
  - Switched to using `tools` (markdown_no_bbox) and `tool_choice` as required by the `nvidia/nemotron-parse` model.
  - Updated content format to use HTML-like `<img>` tag with base64 data.
- **Environment Setup:**
  - Created `.env.example` and `.env` files.
- **Git & Collaboration:**
  - Created `test/nvidia-model` branch.
- **Structure:**
  - Created `tests/` directory for experimental scripts.

## Next Steps
- Provide or generate a sample resume image/PDF for testing.
- Run `tests/test_nvidia_parse.py` with the sample file.
- Verify the quality of Markdown output and PII masking accuracy.
- Prepare `server/app/services/nvidia_service.py` based on test results.

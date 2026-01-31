# Feature Development Guide

This document outlines the scope and implementation details for each feature branch.

## 1. `feature/nvidia-parser` (Priority: High)
- **Goal**: Parse PDF/Image resumes into structured JSON using NVIDIA VLM.
- **Tasks**:
  - [ ] Implement `server/app/services/nvidia_service.py`.
  - [ ] Integrate NVIDIA NIM API (nemotron-parse).
  - [ ] Create PII masking utility using Regex.
  - [ ] Parsing Endpoint: `POST /api/v1/analyze/resume`.

## 2. `feature/elevenlabs-voice` (Priority: High)
- **Goal**: Real-time voice interview with low latency.
- **Tasks**:
  - [ ] Implement `server/app/services/elevenlabs_service.py` (WebSocket Handler).
  - [ ] Secure WebSocket endpoint: `WS /ws/interview/session`.
  - [ ] Frontend Audio Streamer component (`client/src/features/interview/AudioRecorder.tsx`).
  - [ ] Handle Turn-taking (Interruption).

## 3. `feature/gap-analysis` (Priority: Medium)
- **Goal**: Compare Resume vs JD vs GitHub code to find skill gaps.
- **Tasks**:
  - [ ] Implement `server/app/services/github_service.py` (using `git_analyzer` skill).
  - [ ] LLM Prompt Engineering for Gap Analysis.
  - [ ] Generate Roadmap JSON.
  - [ ] API: `POST /api/v1/analyze/gap`.

## 4. `feature/dashboard-ui` (Priority: Medium)
- **Goal**: Visualizing the analysis results and roadmap.
- **Tasks**:
  - [ ] Radar Chart component for Skill Gap.
  - [ ] Roadmap Timeline component.
  - [ ] Google Calendar integration button.
  - [ ] Responsive Layout for Dashboard Page.

# Git Branch Strategy (Team of 3)

## 1. Overview
We use a **Simplified Gitflow** to balance speed and stability.
- **`main`**: Production-ready code. Always deployable.
- **`dev`**: Integration branch. All features merge here first.
- **`feature/*`**: Individual work branches.

## 2. Branch Naming Convention
- Features: `feature/short-description` (e.g., `feature/resume-parser`)
- Bug Fixes: `fix/short-description` (e.g., `fix/login-error`)
- Hotfixes: `hotfix/short-description` (Direct fix to main)

## 3. Workflow
1.  **Start**: Pull latest `dev`.
    ```bash
    git checkout dev
    git pull origin dev
    git checkout -b feature/my-feature
    ```
2.  **Work**: Commit changes (follows `git_convention.md`).
3.  **Merge**:
    - Push feature branch.
    - Create Pull Request (PR) to `dev`.
    - Review (optional but recommended for 3 people).
    - Squid & Merge.
4.  **Release**:
    - When `dev` is stable, merge `dev` to `main`.

## 4. Team Role Division (Suggestion)
- **Dev A (Core/AI)**: `feature/nvidia-parser`, `feature/elevenlabs`
- **Dev B (Backend)**: `feature/api-setup`, `feature/database`
- **Dev C (Frontend)**: `feature/ui-main`, `feature/dashboard`

---
name: git_analyzer
description: Analyzes GitHub repositories using GitHub API to extract tech stack, code style, and skills.
---

# Git Analyzer Skill

This skill allows the agent to analyze a user's GitHub repository. It fetches file structures, reads README/package.json/requirements.txt, and infers the technical stack and depth.

## Usage
Run the script to analyze a repo:
```bash
python .agent/skills/git_analyzer/scripts/analyze_repo.py --url https://github.com/username/repo
```

## Dependencies
- `PyGithub`
- `tree-sitter` (optional for deep analysis)

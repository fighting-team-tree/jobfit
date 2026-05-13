# LLM-Optimized Git Commit Convention

## Commit Message Format
```
type(scope): subject (imperative, max 72 chars)

WHY: One-line reason for the change
WHAT:
- Specific change 1
- Specific change 2

IMPACT: Breaking changes / side effects (only when applicable)
Refs: #issue-number
```

## Types
- **feat**: New feature | **fix**: Bug fix | **docs**: Documentation
- **refactor**: Refactoring | **perf**: Performance | **style**: Formatting
- **test**: Tests | **chore**: Build/config | **ci**: CI/CD

## Scopes
| Scope | Target | Scope | Target |
|-------|--------|-------|--------|
| `dashboard` | DashboardPage + charts | `analysis` | Gap analysis pipeline |
| `profile` | ProfilePage + profile API | `resume` | Resume parser |
| `interview` | InterviewPage + interview API | `jd` | JD scraper |
| `roadmap` | RoadmapPage + roadmap API | `agent` | LangGraph agents |
| `problem` | ProblemPage + problem API | `auth` | Authentication |
| `companies` | CompaniesPage + company API | `api` | API endpoints (general) |
| `deploy` | Deployment config | `config` | Project config |

## Core Rules
1. **WHY is required**: Always include WHY when writing body ("What breaks without this commit?")
2. **WHAT is behavior-focused**: Describe behavior/feature changes, NOT file names
3. **IMPACT is optional**: Only when changes affect other modules
4. **Atomic commits**: One feature/fix per commit

## Branch Strategy
- `main`: Production | `dev`: Integration
- `feature/*`: Feature dev | `fix/*`: Bug fix | `hotfix/*`: Emergency fix

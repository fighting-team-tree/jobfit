# Git Commit Convention

## 1. Commit Message Structure
```
type: Subject

[Optional Body - Why and What]
```

## 2. Types
- **feat**: New feature (새로운 기능)
- **fix**: Bug fix (버그 수정)
- **docs**: Documentation only (문서 수정)
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature (리팩토링)
- **perf**: A code change that improves performance (성능 개선)
- **test**: Adding missing tests or correcting existing tests (테스트)
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation (빌드, 패키지 매니저 설정 등)

## 3. Rules
- **Subject**: Use imperative mood (e.g., "Add feature" not "Added feature"). No period at the end.
- **Body**: Detailed explanation of the change if necessary.
- **Granularity**: Commit atomically. One feature/fix per commit is preferred.

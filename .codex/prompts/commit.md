# Commit Prompt

staged 변경사항을 검토하고 `.codex/rules/03-git-convention.md` 형식의 커밋 메시지를 제안한다.

필수 확인:
1. `git status --short`
2. `git diff --cached`
3. secret/.env/API key/token 포함 여부
4. 원자적 커밋 여부
5. 적절한 type/scope 선택

출력 형식:

```text
type(scope): subject

WHY: ...
WHAT:
- ...

IMPACT: ...
```

# JobFit `.codex/` Structure

Codex 전용 프로젝트 지침, 스킬, 반복 작업 프롬프트를 보관합니다. `.agent/`를 기준(Source of Truth)으로 삼고, `.claude/`의 명령/규칙을 Codex에 맞게 축약·변환했습니다.

## 구조

```text
.codex/
├── README.md
├── rules/
│   ├── 00-multi-tool-sync.md
│   ├── 01-language-preference.md
│   ├── 02-python-uv.md
│   ├── 03-git-convention.md
│   ├── 04-security-pii.md
│   ├── 05-project-structure.md
│   ├── 06-git-branch-strategy.md
│   └── 07-continuous-documentation.md
├── skills/
│   ├── ai-pipeline-review/
│   ├── architecture-review/
│   ├── frontend-product-review/
│   ├── git-convention/
│   ├── jobfit-development/
│   ├── security-privacy-review/
│   └── test-qa-review/
└── prompts/
    ├── commit.md
    ├── lint.md
    ├── setup.md
    ├── start-client.md
    ├── start-server.md
    ├── test-jd.md
    └── test-resume.md
```

## 사용 원칙

- 저장소 전체 지침은 루트 `AGENTS.md`가 진입점입니다.
- 커밋 메시지 작성/검토는 `skills/git-convention`을 사용합니다.
- 일상 개발 명령과 검증 루틴은 `skills/jobfit-development` 또는 `prompts/`를 참고합니다.
- 전문 리뷰는 목적에 맞게 `architecture-review`, `security-privacy-review`, `ai-pipeline-review`, `frontend-product-review`, `test-qa-review`를 사용합니다.
- `.agent/`, `.claude/`, `.codex/` 규칙이 갈라지면 `.agent/`를 우선 기준으로 삼고 필요한 경우 동기화합니다.

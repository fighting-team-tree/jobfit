---
name: git-convention
description: JobFit 프로젝트의 커밋 메시지 작성, staged diff 검토, 커밋 단위 분리, 보안 패턴 점검에 사용합니다.
---

# Git Convention Skill - JobFit

JobFit 프로젝트에서 커밋 메시지를 작성하거나 검토할 때 사용합니다.

## 언제 사용하나

- 사용자가 커밋 메시지를 작성해 달라고 할 때
- staged diff를 보고 커밋 단위를 나누거나 검토할 때
- 기존 커밋 메시지가 프로젝트 컨벤션을 따르는지 확인할 때

## 절차

1. `git status --short`로 변경 범위를 확인합니다.
2. `git diff --cached`로 staged diff를 확인합니다.
   - staged 변경이 없으면 `git diff`와 untracked 파일을 요약하고 stage가 필요하다고 보고합니다.
3. 보안 패턴을 검사합니다.
   - `.env`, API key, `SECRET=`, `TOKEN=`, `sk-`, `ghp_`, credential 파일 등.
4. 원자성을 확인합니다.
   - 독립적인 기능/수정이 섞였으면 분리 커밋을 제안합니다.
5. 아래 형식으로 메시지를 작성합니다.

```text
type(scope): subject

WHY: 변경 이유 한 줄
WHAT:
- 기능/동작 중심 변경사항

IMPACT: 다른 모듈 영향 또는 파괴적 변경 (해당 시)
Refs: #이슈번호 (선택)
```

## 작성 규칙

- subject는 한국어 명령형, 72자 이내, 마침표 없음.
- WHY는 “이 커밋이 없으면 어떤 문제가 남는가?”에 답합니다.
- WHAT은 파일명 대신 사용자/시스템 동작 변화를 씁니다.
- IMPACT는 API, DB, 인증, 배포, 외부 연동 영향이 있을 때만 씁니다.
- 첫 줄 `type(scope): subject`는 필수이며, Lore/런타임 trailer가 이를 대체할 수 없습니다.
- 상위 Codex 런타임이 별도 trailer를 요구하면 프로젝트 WHY/WHAT/IMPACT 뒤에 추가합니다.
- 최종 메시지는 `uv run python scripts/validate_commit_msg.py <msg-file>` 또는 `.githooks/commit-msg` 훅으로 검증합니다.

## 타입

`feat`, `fix`, `docs`, `refactor`, `perf`, `style`, `test`, `chore`, `ci` 중 하나를 사용합니다.

## 스코프

`dashboard`, `analysis`, `profile`, `resume`, `interview`, `jd`, `roadmap`, `agent`, `problem`, `auth`, `companies`, `api`, `deploy`, `config`, `docs`.

## 예시

```text
fix(resume): pytest 수집 중 PyMuPDF import 경고 제거

WHY: 테스트 수집 단계에서 PyMuPDF 경고가 error 모드 실패로 이어짐
WHAT:
- PDF 처리 시점에만 PyMuPDF를 lazy import
- 수동 NVIDIA 파서 함수가 pytest test로 수집되지 않도록 분리
```

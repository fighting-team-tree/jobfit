# Git Branch Strategy

## 브랜치

- `main`: 프로덕션 배포 가능 상태
- `dev`: 기능 통합 브랜치
- `feature/<short-description>`: 기능 개발
- `fix/<short-description>`: 버그 수정
- `hotfix/<short-description>`: 긴급 수정

## 기본 흐름

```bash
git checkout dev
git pull origin dev
git checkout -b feature/my-feature
# work + test
git push origin feature/my-feature
# PR to dev
```

커밋 메시지는 `.codex/rules/03-git-convention.md`를 따릅니다.

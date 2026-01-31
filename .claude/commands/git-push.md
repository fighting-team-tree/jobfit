# GitHub 푸시 (학습 결과)

풀이한 문제나 솔루션을 GitHub 레포지토리에 자동 푸시합니다.

## 1. GitHub 토큰 검증
```bash
curl -X POST http://localhost:8000/api/v1/git/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token": "ghp_your_personal_access_token"}'
```

## 2. 레포지토리 목록 조회
```bash
curl -X POST http://localhost:8000/api/v1/git/repos \
  -H "Content-Type: application/json" \
  -d '{"token": "ghp_your_token"}'
```

## 3. 솔루션 푸시
```bash
curl -X POST http://localhost:8000/api/v1/git/push-solution \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ghp_your_token",
    "repo_full_name": "username/study-repo",
    "week": 1,
    "problem_id": "prob_1_1",
    "problem_title": "Docker 컨테이너 생성",
    "solution_code": "# 솔루션 코드...",
    "language": "python"
  }'
```

## 파일 구조
```
study-repo/
├── solutions/
│   └── week1/
│       └── prob_1_1.py
└── problems/
    └── week1/
        └── prob_1_1.md
```

## 필요 권한
- GitHub Personal Access Token (repo 권한)

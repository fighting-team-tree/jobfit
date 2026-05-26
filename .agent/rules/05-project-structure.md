# JobFit Project Structure

```text
jobfit/
├── server/                 # FastAPI 백엔드
│   ├── main.py             # uvicorn main:app 엔트리포인트
│   └── app/
│       ├── api/v1/endpoints/   # API 엔드포인트
│       ├── agents/             # LangGraph/AI 에이전트
│       ├── core/               # 설정, 인증, DB
│       ├── models/             # DB/User 모델
│       └── services/           # 비즈니스 로직
├── client/                 # React/Vite 프론트엔드
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── pages/
├── tests/                  # pytest 테스트와 수동 실험 스크립트
├── .agent/                 # 공통 AI Agent 기준 규칙/메모리
├── .claude/                # Claude Code 전용 명령/규칙
├── .codex/                 # Codex 전용 규칙/스킬/프롬프트
├── .githooks/              # Git hook 검증 스크립트 진입점
└── scripts/                # 저장소 보조 검증 스크립트
```

## 핵심 파일

| 파일 | 역할 |
| --- | --- |
| `server/app/services/resume_parser_service.py` | PDF/이미지 이력서 파싱 |
| `server/app/services/jd_scraper_service.py` | JD URL 스크래핑 및 SSRF 방어 |
| `server/app/services/llm_service.py` | LLM 호출 추상화 |
| `server/app/services/embedding_service.py` | 임베딩 생성 |
| `server/app/agents/roadmap_agent.py` | 학습 로드맵 생성 |
| `server/app/agents/problem_generator.py` | 문제 생성 |
| `client/src/lib/api.ts` | API 클라이언트 |
| `client/src/lib/authStore.ts` | 인증 상태 저장소 |
| `scripts/validate_commit_msg.py` | JobFit 커밋 메시지 컨벤션 검증 |

## 포트

- Backend: `8000`
- Frontend: `5173`

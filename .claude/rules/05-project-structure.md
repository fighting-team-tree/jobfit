# JobFit 프로젝트 구조

## 디렉토리 구조
```
jobfit/
├── server/                 # FastAPI 백엔드
│   ├── main.py             # 엔트리포인트 (uvicorn main:app)
│   └── app/
│       ├── api/v1/endpoints/   # API 엔드포인트
│       ├── agents/             # Claude AI 에이전트 (LangGraph)
│       ├── services/           # 비즈니스 로직
│       └── core/               # 설정
│
├── client/                 # React 프론트엔드
│   └── src/
│       ├── pages/          # 페이지 컴포넌트
│       ├── components/     # 재사용 컴포넌트
│       └── lib/            # API, Store
│
└── data/                   # 샘플 데이터
```

## 핵심 파일
| 파일 | 역할 |
|------|------|
| `server/app/agents/matching_agent.py` | 채용 매칭 에이전트 |
| `server/app/agents/roadmap_agent.py` | 학습 로드맵 생성 |
| `server/app/services/nvidia_service.py` | NVIDIA LLM 연동 |
| `server/app/services/skill_matcher_service.py` | 임베딩 기반 스킬 매칭 |
| `client/src/lib/api.ts` | API 클라이언트 |
| `client/src/lib/store.ts` | Zustand 스토어 |

## 포트
- Backend: `8000`
- Frontend: `5173`

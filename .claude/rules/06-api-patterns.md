# API 패턴 규칙

## 1. 엔드포인트 구조
- 모든 API는 `/api/v1/` prefix 사용
- RESTful 네이밍 컨벤션 준수

## 2. 주요 엔드포인트
| Endpoint | 용도 |
|----------|------|
| `/api/v1/analyze/resume` | 이력서 분석 |
| `/api/v1/analyze/resume/file` | 파일 이력서 분석 |
| `/api/v1/analyze/jd/url` | JD 스크래핑 |
| `/api/v1/analyze/gap` | 갭 분석 |
| `/api/v1/companies/` | 회사 CRUD |
| `/api/v1/roadmap/` | 학습 로드맵 |
| `/api/v1/git/` | GitHub 연동 |

## 3. 요청/응답 모델
- Pydantic 모델로 정의
- 명확한 타입 힌트 사용

```python
from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    profile: ProfileData
    jd_text: str

class AnalyzeResponse(BaseModel):
    match_score: float
    matching_skills: list[str]
    missing_skills: list[str]
```

## 4. 에러 처리
- HTTPException으로 표준 에러 반환
- 상태 코드 일관성 유지 (400, 404, 500)

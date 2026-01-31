# 학습 로드맵 생성

부족한 스킬에 대한 맞춤형 학습 로드맵을 생성합니다.

## 로드맵 생성
```bash
curl -X POST http://localhost:8000/api/v1/roadmap/generate \
  -H "Content-Type: application/json" \
  -d '{
    "missing_skills": ["Kubernetes", "AWS", "Docker"],
    "timeline_weeks": 4,
    "target_role": "DevOps Engineer",
    "current_level": "intermediate"
  }'
```

## 주차별 문제 생성
```bash
curl -X POST http://localhost:8000/api/v1/roadmap/{roadmap_id}/weeks/{week_number}/problems \
  -H "Content-Type: application/json" \
  -d '{"num_problems": 3}'
```

## 응답 형식
```json
{
  "id": "roadmap_20260201_123456",
  "title": "DevOps 스킬 마스터 로드맵",
  "weeks": [
    {
      "week_number": 1,
      "title": "Week 1: Docker 기초",
      "focus_skills": ["Docker"],
      "learning_objectives": ["컨테이너 개념 이해", "Dockerfile 작성"],
      "resources": ["Docker 공식 문서", "..."],
      "estimated_hours": 10
    }
  ]
}
```

## 필요 환경변수
- `ANTHROPIC_API_KEY`: Claude API 키

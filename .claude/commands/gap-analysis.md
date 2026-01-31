# 갭 분석 실행

프로필과 JD를 비교하여 갭 분석을 수행합니다.

## API 테스트
```bash
curl -X POST http://localhost:8000/api/v1/analyze/gap \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "skills": ["Python", "FastAPI", "React"],
      "experience": [],
      "education": []
    },
    "jd_text": "채용공고 텍스트..."
  }'
```

## 분석 방식 (Hybrid Approach)
1. **Extraction (LLM)**: Temperature 0으로 스킬 리스트 JSON 추출
2. **Matching (Embedding)**: NV-Embed + Cosine Similarity로 매칭
3. **Scoring**: 필수(70%) + 우대(30%) 가중치 계산

## 응답 형식
```json
{
  "match_score": 75,
  "matching_skills": ["Python", "FastAPI"],
  "missing_skills": ["Kubernetes", "AWS"],
  "score_breakdown": {
    "required_skills": 50,
    "preferred_skills": 25
  }
}
```

# 회사별 매칭 분석 (Claude Agent)

Claude Agent를 사용하여 회사별 채용 매칭 분석을 수행합니다.

## 1. 회사 생성
```bash
curl -X POST http://localhost:8000/api/v1/companies/ \
  -H "Content-Type: application/json" \
  -d '{"name": "토스", "jd_text": "채용공고 내용..."}'
```

## 2. 매칭 분석 실행
```bash
curl -X POST http://localhost:8000/api/v1/companies/{company_id}/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "skills": ["Python", "FastAPI", "React"],
      "experience": [],
      "projects": []
    }
  }'
```

## Agent 파이프라인 (LangGraph)
1. `analyze_jd` - JD 분석 및 요구사항 추출
2. `extract_profile_skills` - 프로필 스킬 추출
3. `match_skills` - 필수/우대 스킬 매칭
4. `calculate_score` - 점수 계산 (필수 70% + 우대 20% + 경험 10%)

## 필요 환경변수
- `ANTHROPIC_API_KEY`: Claude API 키

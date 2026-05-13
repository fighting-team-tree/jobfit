# 임베딩 기반 스킬 매칭

## 문제점
LLM만으로 스킬 매칭 시:
- 같은 입력에도 다른 결과 (temperature > 0)
- 매칭 기준이 불명확
- 동의어/유사어 처리 불일관

## 솔루션: 2단계 하이브리드 접근

### Phase 1: LLM으로 스킬 추출
```
이력서/JD → LLM (temperature=0) → 스킬 리스트
```

### Phase 2: 임베딩으로 매칭
```
프로필 스킬 → Embedding → 벡터
JD 스킬 → Embedding → 벡터
→ Cosine Similarity로 매칭
```

## 매칭 알고리즘
```python
def match_skills(profile_skills: list, jd_skills: list, threshold=0.75):
    profile_emb = get_embeddings(profile_skills)
    jd_emb = get_embeddings(jd_skills)

    similarity_matrix = cosine_similarity(profile_emb, jd_emb)

    matched, missing = [], []
    for j, jd_skill in enumerate(jd_skills):
        max_sim = similarity_matrix[:, j].max()
        if max_sim >= threshold:
            matched.append(jd_skill)
        else:
            missing.append(jd_skill)

    return matched, missing
```

## 점수 계산
```python
def calculate_score(matched_required, total_required,
                    matched_preferred, total_preferred):
    required_score = (matched_required / total_required) * 70
    preferred_score = (matched_preferred / total_preferred) * 30
    return round(required_score + preferred_score)
```

## 임계값 가이드
| 값 | 의미 | 예시 |
|----|------|------|
| 0.9+ | 거의 동일 | Python ↔ 파이썬 |
| 0.8-0.9 | 높은 관련성 | FastAPI ↔ Flask |
| 0.7-0.8 | 관련 있음 | React ↔ Vue.js |

**권장**: 필수 요건 0.8, 우대 요건 0.7

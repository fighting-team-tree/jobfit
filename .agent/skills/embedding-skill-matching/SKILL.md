---
name: embedding-skill-matching
description: Embedding-based skill matching using vector similarity for consistent gap analysis results
---

# Embedding-Based Skill Matching

LLM 출력의 비결정성 문제를 해결하기 위해 임베딩 벡터 유사도 기반의 스킬 매칭을 사용합니다.

---

## 문제점

LLM만으로 스킬 매칭 시:
- 같은 입력에도 다른 결과 출력 (temperature > 0)
- 매칭 기준이 불명확 (모델의 주관적 판단)
- 동의어/유사어 처리가 일관되지 않음

---

## 솔루션: 2단계 하이브리드 접근

### Phase 1: LLM으로 스킬 추출 (Extraction)
```
이력서/JD → LLM → 스킬 리스트
```
- temperature=0으로 추출 일관성 확보
- 정형화된 JSON 출력 강제

### Phase 2: 임베딩으로 매칭 (Matching)
```
프로필 스킬 → Embedding → 벡터
JD 스킬 → Embedding → 벡터
→ Cosine Similarity로 매칭
```

---

## 핵심 알고리즘

### 1. 스킬 임베딩 생성
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')  # 또는 NVIDIA NV-Embed

def get_skill_embeddings(skills: list[str]) -> np.ndarray:
    return model.encode(skills, normalize_embeddings=True)
```

### 2. Cosine Similarity 매칭
```python
from sklearn.metrics.pairwise import cosine_similarity

def match_skills(profile_skills: list, jd_skills: list, threshold=0.7):
    profile_emb = get_skill_embeddings(profile_skills)
    jd_emb = get_skill_embeddings(jd_skills)
    
    similarity_matrix = cosine_similarity(profile_emb, jd_emb)
    
    matched = []
    missing = []
    
    for j, jd_skill in enumerate(jd_skills):
        max_sim = similarity_matrix[:, j].max()
        if max_sim >= threshold:
            matched.append(jd_skill)
        else:
            missing.append(jd_skill)
    
    return matched, missing
```

### 3. 점수 계산
```python
def calculate_score(matched_required, total_required, 
                    matched_preferred, total_preferred):
    required_score = (matched_required / total_required) * 70 if total_required > 0 else 70
    preferred_score = (matched_preferred / total_preferred) * 30 if total_preferred > 0 else 0
    return round(required_score + preferred_score)
```

---

## 임베딩 모델 옵션

| 모델 | 특징 | 크기 |
|------|------|------|
| `all-MiniLM-L6-v2` | 빠름, 가벼움 | 80MB |
| `all-mpnet-base-v2` | 정확도 높음 | 420MB |
| `NVIDIA NV-Embed-v2` | NVIDIA API 사용 가능 | API |
| `intfloat/e5-large-v2` | 다국어 지원 | 1.3GB |

---

## NVIDIA NV-Embed API 사용

NVIDIA NIM에서 임베딩 API 제공:

```python
async def get_nvidia_embedding(texts: list[str]) -> list[list[float]]:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://integrate.api.nvidia.com/v1/embeddings",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "nvidia/nv-embedqa-e5-v5",
                "input": texts,
                "input_type": "query"
            }
        )
        return [d["embedding"] for d in response.json()["data"]]
```

---

## 매칭 임계값 가이드라인

| 임계값 | 의미 | 예시 |
|--------|------|------|
| 0.9+ | 거의 동일 | "Python" ↔ "파이썬" |
| 0.8-0.9 | 높은 관련성 | "FastAPI" ↔ "Flask" |
| 0.7-0.8 | 관련 있음 | "React" ↔ "Vue.js" |
| 0.6-0.7 | 약한 관련성 | "Machine Learning" ↔ "Data Science" |
| <0.6 | 관련 없음 | "Python" ↔ "Kubernetes" |

**권장 임계값: 0.75** (필수 요건은 0.8, 우대 요건은 0.7)

---

## 구현 체크리스트

- [ ] 임베딩 서비스 구현 (`embedding_service.py`)
- [ ] 스킬 매칭 서비스 구현 (`skill_matcher_service.py`)
- [ ] `analyze_gap` 함수 리팩토링
- [ ] 캐싱 추가 (같은 스킬 재계산 방지)
- [ ] 테스트 및 임계값 튜닝

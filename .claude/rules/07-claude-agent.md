# Claude Agent 규칙 (LangGraph)

## 1. 에이전트 구조
에이전트는 `server/app/agents/` 디렉토리에 위치

### 현재 에이전트
- `matching_agent.py` - 채용 매칭 분석
- `roadmap_agent.py` - 학습 로드맵 생성
- `problem_generator.py` - 연습 문제 생성

## 2. LangGraph 패턴
```python
from langgraph.graph import StateGraph, START, END

class MatchState(TypedDict):
    profile: dict
    jd_text: str
    # ... intermediate results
    match_score: Optional[float]

class JobMatchingAgent:
    def _build_graph(self) -> StateGraph:
        builder = StateGraph(MatchState)
        builder.add_node("analyze_jd", self._analyze_jd_node)
        builder.add_node("match_skills", self._match_skills_node)
        builder.add_edge(START, "analyze_jd")
        builder.add_edge("analyze_jd", "match_skills")
        builder.add_edge("match_skills", END)
        return builder.compile()
```

## 3. Claude API 사용
- 모델: `claude-sonnet-4-20250514`
- JSON 출력 강제 (프롬프트에서 "Return ONLY the JSON" 명시)
- 코드 블록 제거 처리 필수

```python
content = response.content[0].text.strip()
if content.startswith("```"):
    content = content.split("```")[1]
    if content.startswith("json"):
        content = content[4:]
```

## 4. 싱글톤 패턴
```python
agent: Optional[MyAgent] = None

def get_agent() -> MyAgent:
    global agent
    if agent is None:
        agent = MyAgent()
    return agent
```

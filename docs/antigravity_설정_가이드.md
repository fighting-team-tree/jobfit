# AI for Personal Impact: 차세대 가상 면접 에이전트 구축을 위한 심층 기술 연구 보고서

## 1. 서론: 개인의 한계를 돌파하는 AI (AI for Personal Impact)

### 1.1 배경 및 목적

패스트캠퍼스 빌더톤(Fast Builderthon)의 핵심 주제인 'AI for Personal Impact'는 단순한 자동화를 넘어, 개인의 학습, 업무, 사고방식의 확장을 목표로 한다[Image 4][Image 5]. 현대 구직 시장에서 개인은 정보의 비대칭성과 피드백의 부재라는 한계에 직면해 있다. 본 보고서는 이러한 문제를 해결하기 위해 **ElevenLabs, NVIDIA, Replit**의 첨단 기술을 융합한 '지능형 가상 면접 및 커리어 코칭 에이전트'의 기술적 구현 방안을 심층 분석한다.

특히 본 프로젝트는 구글의 차세대 에이전트 기반 IDE인 **Google Antigravity**를 개발 환경으로 채택하여, 개발 과정 자체에서도 'Agent-First' 패러다임을 적용, 생산성을 극대화하는 방안을 포함한다. 이는 서비스의 결과물뿐만 아니라 만드는 과정(Process)에서도 AI의 본질적인 가치를 실현하기 위함이다.

### 1.2 서비스 아키텍처 개요

본 서비스는 사용자의 이력서(PDF/Image)와 깃허브(GitHub) 레포지토리를 분석하여 '기술적 공백(Skill Gap)'을 도출하고, 이를 바탕으로 실전과 유사한 음성 면접을 진행하며, 부족한 역량을 보완할 학습 로드맵을 제공한다.

- **입력 계층 (Perception Layer):** NVIDIA NIM 기반의 고성능 VLM(Vision Language Model)을 활용한 문서 이해.
- **상호작용 계층 (Interaction Layer):** ElevenLabs Conversational AI SDK를 활용한 초저지연 음성 대화.
- **인지 계층 (Cognitive Layer):** LLM 기반의 역량 분석 및 질문 생성 (RAG 파이프라인).
- **인프라 계층 (Infrastructure Layer):** Replit Deployment 및 Google Calendar/Discord 연동 자동화.
- **개발 환경 (Dev Environment):** Google Antigravity IDE의 `.agent` 아키텍처 활용.

---

## 2. 개발 환경 전략: Google Antigravity 기반의 에이전트 오케스트레이션

성공적인 MVP(Minimum Viable Product) 개발을 위해서는 개발 도구의 효율성이 필수적이다. Google Antigravity는 기존의 코파일럿(Copilot) 방식을 넘어, 개발자가 '매니저'가 되어 AI 에이전트에게 작업을 위임하는 구조를 가진다. 본 프로젝트의 복잡한 4가지 과제(OCR, 음성, LLM, 배포)를 병렬로 처리하기 위해 Antigravity의 폴더 구조와 규칙(Rules)을 사전에 정의한다.

### 2.1 `.agent` 디렉토리 아키텍처 설계

Antigravity의 핵심은 프로젝트 루트의 `.agent` 디렉토리이다. 이 구조를 통해 AI 모델(Gemini 3 Pro 등)이 프로젝트의 컨텍스트를 정확히 이해하고 도구를 사용할 수 있게 한다.

### 2.1.1 Skills (기술) 정의: `.agent/skills/`

각 외부 기술 스택(NVIDIA, ElevenLabs, Replit)을 Antigravity 에이전트가 사용할 수 있는 'Skill'로 캡슐화한다. 이는 개발자가 일일이 문서를 찾아보는 시간을 줄이고, 에이전트가 정확한 API 명세를 따르게 한다.

| **Skill 디렉토리 명** | **역할 및 기능 정의 (SKILL.md)** | **관련 스크립트** |
| --- | --- | --- |
| `nvidia-nim-client` | NVIDIA NIM 엔드포인트 호출, 모델 리스트 조회, VLM 추론 요청 처리 | `query_nim.py` |
| `elevenlabs-voice` | ElevenLabs Conversational AI 설정, 웹소켓 연결 테스트, 보이스 ID 관리 | `test_voice.py` |
| `replit-deploy` | `.replit` 및 `replit.nix` 설정 검증, 배포 상태 모니터링 | `check_config.sh` |
| `git-analyzer` | GitHub API를 통해 사용자 레포지토리 구조 및 언어 분석 | `fetch_repo.py` |

### 2.1.2 Rules (규칙) 설정: `.agent/rules/`

프로젝트 전반에 적용될 제약 조건을 정의하여 에이전트가 생성하는 코드의 품질을 보장한다.

- **`architecture.md`**: "모든 백엔드 로직은 FastAPI를 사용하며, 비동기(async) 처리를 기본으로 한다. 음성 처리는 WebSocket을 통해 실시간성을 보장해야 한다."
- **`security.md`**: "API Key(ElevenLabs, NVIDIA)는 절대 코드에 하드코딩하지 않으며, Replit의 Secrets 기능을 사용해 `os.environ`으로 로드한다."
- **`style-guide.md`**: "Python 코드는 PEP 8을 준수하며, 모든 함수에는 Type Hint를 포함한다."

### 2.1.3 Workflows (워크플로우) 정의: `.agent/workflows/`

반복되는 작업을 자동화하기 위한 절차서이다.

- **`deploy-check.md`**: Replit 배포 전 `replit.nix` 의존성 확인 -> 환경변수 점검 -> 로컬 빌드 테스트 순서로 진행.

이러한 Antigravity 설정은 개발자가 "NVIDIA NIM을 연동해줘"라고 명령했을 때, 에이전트가 사전에 정의된 `nvidia-nim-client` 스킬을 로드하여 정확한 구현을 수행하게 만든다.

---

## 3. Task 1: NVIDIA NIM을 활용한 고성능 이력서 파싱 (Perception)

### 3.1 기술적 과제: 비정형 데이터의 구조화

이력서는 PDF나 이미지(JPG/PNG) 형태로 제공되며, 다단 편집, 표, 그래프 등 복잡한 레이아웃을 포함한다. 기존의 단순 OCR(Tesseract 등)은 텍스트 위치 정보를 잃어버려 "경력"과 "프로젝트" 섹션을 구분하지 못하는 문제가 있다.

### 3.2 NVIDIA NIM & NeMo Curator 솔루션

NVIDIA NIM(NVIDIA Inference Microservices)은 최적화된 AI 모델을 컨테이너 형태로 제공하여 배포 복잡성을 제거한다. 본 프로젝트에서는 단순 OCR을 넘어 문서의 시각적 구조를 이해하는 **VLM(Vision Language Model)** 기반의 접근이 필요하다.

### 3.2.1 모델 선정 및 구현 전략

- **모델 후보**: NVIDIA API Catalog에서 제공하는 `nvidia/cosmos-reason2` 계열 또는 `microsoft/phi-3-vision` 등의 VLM을 NIM으로 호스팅하여 사용한다.
- **NeMo Curator 활용**: 만약 수집된 이력서 데이터로 모델을 미세 조정(Fine-tuning)해야 한다면 NeMo Curator를 사용하여 데이터를 정제할 수 있으나, 해커톤 기간과 리소스 제약을 고려할 때 **Pre-trained VLM NIM**을 활용한 **Zero-shot Prompting**이 현실적이다.

### 3.2.2 기술적 병목 및 해결 방안 (Latency vs. Accuracy)

- **병목**: 고해상도 이미지 업로드 및 VLM 추론은 텍스트 모델 대비 높은 지연 시간을 유발할 수 있다.
- **해결책**:
    1. **전처리(Preprocessing)**: 업로드된 PDF를 `pdf2image`를 통해 적정 해상도(예: 1024px width)의 이미지로 변환.
    2. **구조화 프롬프트**: VLM에게 단순 텍스트 추출이 아닌, JSON 포맷의 출력을 강제한다.
        
        ```json
        {
          "sections": {
            "education": ["..."],
            "experience": [{"company": "...", "role": "..."}],
            "skills":
          }
        }
        ```
        
    
    1. **Antigravity Skill 구현**: `.agent/skills/resume-parser/scripts/parse.py`에 NVIDIA NIM API 호출 로직을 캡슐화하여, 에이전트가 이를 호출하게 한다.

### 3.3 구현 코드 예시 (NIM API 호출)

```python
#.agent/skills/nvidia-nim-client/scripts/query_nim.py
import requests
import base64

def invoke_nim_vlm(image_path, api_key):
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions" # 예시 엔드포인트
    
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()

    payload = {
        "model": "nvidia/vila-b1", # 예시 모델
        "messages":,
        "temperature": 0.1
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(invoke_url, headers=headers, json=payload)
    return response.json()
```

*AI Necessity:* 단순 텍스트 추출이 아니라 레이아웃의 의미(Semantic)를 이해하여 직무 연관성을 파악하는 데 VLM이 필수적이다.

---

## 4. Task 2: ElevenLabs SDK 기반 초저지연 대화형 면접 시스템

### 4.1 핵심 목표: "실시간성(Real-time)" 확보

면접은 고도의 턴테이킹(Turn-taking) 과정이다. 사용자의 답변이 끝남과 동시에 AI가 반응해야 몰입감이 유지된다. 일반적인 STT(Speech-to-Text) -> LLM -> TTS(Text-to-Speech) 파이프라인은 3~5초의 지연이 발생하여 면접 경험을 저해한다.

### 4.2 ElevenLabs Conversational AI 아키텍처

ElevenLabs의 Conversational AI SDK는 이러한 지연을 최소화하기 위해 **WebSocket**을 통한 전이중(Full-duplex) 통신을 지원한다.

### 4.2.1 아키텍처 설계

- **Client-Side (React/Frontend)**: 사용자의 마이크 입력을 스트리밍하고, 서버로부터 오는 오디오 스트림을 즉시 재생한다.
- **Server-Side (FastAPI/Backend)**: ElevenLabs Agent와 클라이언트 간의 보안 연결을 중개한다.
- **Interruptibility (끼어들기)**: 사용자가 말하기 시작하면 AI의 발화를 즉시 중단시키는 기능이 필수적이다. ElevenLabs SDK는 이를 내장 VAD(Voice Activity Detection)로 지원한다.

### 4.2.2 보안 및 구현 세부사항

클라이언트에서 직접 API Key를 사용하는 것은 보안상 위험하므로, 백엔드에서 `Signed URL`을 발급받아 연결해야 한다.

**구현 워크플로우 (Python SDK 활용):**

1. **Agent 생성**: ElevenLabs 대시보드에서 프롬프트를 설정하여 면접관 페르소나를 가진 Agent 생성.
2. **Signed URL 발급**:Python

```python
# Backend (FastAPI)
from elevenlabs.client import ElevenLabs

async def get_interview_session(agent_id: str):
    client = ElevenLabs(api_key=os.getenv("ELEVEN_API_KEY"))
    # SDK를 통해 서명된 웹소켓 URL 획득
    response = await client.conversational_ai.conversations.get_signed_url(agent_id=agent_id)
    return {"signed_url": response.signed_url}
```

1. **Frontend 연결**: 반환된 URL을 사용하여 React 컴포넌트에서 웹소켓 연결 수립.

### 4.2.3 기술적 병목 및 해결: 의존성 관리

ElevenLabs SDK의 오디오 입출력 기능(`pyaudio` 등)은 시스템 레벨의 라이브러리(`portaudio`)를 요구한다. Replit 환경에서는 `pip install` 만으로는 이를 해결할 수 없다.

- **해결책**: `replit.nix` 파일에 `pkgs.portaudio`, `pkgs.ffmpeg` 등의 시스템 패키지를 명시해야 한다(6장 참조).

*Real Impact:* 실제 면접관과 대화하는 듯한 끊김 없는 경험은 사용자의 긴장감을 유발하고 실전 감각을 극대화하여 실제 면접 성공률을 높인다.

---

## 5. Task 3: 동적 학습 로드맵 생성을 위한 LLM 프롬프트 엔지니어링

### 5.1 데이터 기반의 역량 분석 (Gap Analysis)

사용자가 제출한 '이력서(보유 기술)'와 지원하고자 하는 'JD(요구 기술)', 그리고 실제 코드를 담은 'GitHub 레포지토리(증명된 기술)' 간의 차이를 분석한다.

### 5.2 LLM 프롬프트 엔지니어링 전략

단순히 "부족한 점을 말해줘"라는 프롬프트는 추상적인 조언만 생성한다. 구체적인 로드맵을 위해 **Chain-of-Thought (CoT)** 기법을 적용한다.

### 5.2.1 프롬프트 구조 설계

1. **Context Injection**: 파싱된 이력서 JSON, GitHub 분석 요약(언어 분포, 주요 라이브러리), JD 텍스트.
2. **Analysis Step**:
    - 보유했으나 증명되지 않은 기술 (이력서엔 있으나 깃허브엔 없음)
    - 요구되으나 보유하지 않은 기술 (JD엔 있으나 이력서엔 없음)
3. **Roadmap Generation**:
    - 주차별(Weekly) 학습 계획 수립.
    - 각 학습 항목에 추천 프로젝트 주제 포함.

### 5.2.2 깃허브 분석을 위한 Antigravity 활용

GitHub API를 호출하여 레포지토리의 `README.md`, `package.json` 등을 가져오는 로직을 Antigravity의 `git-analyzer` 스킬로 구현한다. 에이전트가 "사용자의 React 숙련도를 분석해"라고 요청받으면, 해당 스킬이 레포지토리를 순회하며 `useEffect`, `Redux` 등의 키워드 사용 빈도를 추출하여 LLM에게 전달한다.

### 5.3 개인화된 학습 콘텐츠 추천

분석된 공백을 메우기 위해 검색 API(Google Custom Search 등)와 연동하여 구체적인 학습 리소스(공식 문서, 튜토리얼 영상)를 링크로 제공한다.

---

## 6. Task 4: Replit Deployment 환경에서의 운영 및 자동화

### 6.1 Replit 배포 환경 구성

Replit은 컨테이너 기반의 배포를 지원하며, 프로젝트의 설정을 `.replit`과 `replit.nix` 파일로 관리한다. 본 서비스는 FastAPI 백엔드와 React 프론트엔드를 하나의 **Monorepo**로 구성하여 배포 효율성을 높인다.

### 6.1.1 `replit.nix` 구성 (시스템 의존성)

ElevenLabs SDK와 NVIDIA 이미지 처리를 위한 필수 패키지를 정의한다.

Nix

```nix
{ pkgs }: {
  deps =;
}
```

### 6.1.2 `.replit` 구성 (실행 명령)

백엔드와 프론트엔드를 동시에 실행하거나, 배포 시 실행할 커맨드를 정의한다.

Ini, TOML

```toml
[deployment]
run = ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 80"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 8000
externalPort = 80
```

*주의사항*: Replit 배포 시 포트 매핑 이슈가 빈번하므로, 외부 포트 80 또는 443을 애플리케이션 포트와 정확히 매핑해야 한다.

### 6.2 워크플로우 자동화 (Calendar & Discord)

면접 일정 관리와 학습 알림을 위해 외부 서비스를 연동한다. 이는 Antigravity의 'Workflow' 기능을 통해 개발 단계에서 테스트할 수 있다.

- **Google Calendar**: `google-auth-oauthlib`를 사용하여 면접 일정을 사용자의 캘린더에 자동 등록한다.
- **Discord/Slack Webhook**: 학습 로드맵의 진행 상황을 매일 아침 알림으로 전송한다. `requests.post(webhook_url, json={"content": "오늘의 학습 목표..."})` 형태로 간단히 구현 가능하나, Replit의 'Always On' 기능을 사용하거나 예약된 작업(Scheduled Task)을 설정해야 한다.

---

## 7. 해커톤 심사 기준 대응 전략

### 7.1 Completeness (완성도)

- **전략**: Replit의 배포 기능을 사용하여 접속 가능한 Live URL을 제출한다. Antigravity의 에이전트 워크플로우를 활용해 개발 속도를 단축하고, 남은 시간을 QA와 UI 폴리싱에 투자한다.
- **증명**: GitHub 리포지토리에 `.agent` 폴더를 포함하여 AI 에이전트와 협업한 로그(Artifacts)를 함께 제출함으로써 개발 프로세스의 혁신성을 증명한다.

### 7.2 AI Necessity (AI 필요성)

- **전략**: 단순한 CRUD 앱이 아님을 강조한다. VLM 없이는 이력서의 맥락을 이해할 수 없고, 초저지연 음성 AI 없이는 실시간 면접이 불가능하며, LLM 추론 없이는 개인화된 로드맵이 불가능함을 어필한다[Image 6].

### 7.3 Real Impact (실제 영향)

- **전략**: "면접 공포증 극복", "비효율적인 검색 시간 단축" 등 정성적 가치뿐만 아니라, "모의 면접 비용 0원", "커리어 분석 시간 10초" 등의 정량적 지표를 제시한다.

---

## 8. 결론

본 보고서에서 설계한 '가상 면접 에이전트'는 NVIDIA NIM의 인지 능력, ElevenLabs의 소통 능력, 그리고 Replit의 배포 유연성을 결합한 **Hyper-Personalized AI** 서비스이다. 특히 Google Antigravity라는 새로운 도구를 도입하여, 에이전트가 에이전트를 만드는(Agent Building Agent) 메타 개발 방식을 적용함으로써, 개발 생산성과 서비스 품질을 동시에 달성할 수 있다. 이는 빌더톤의 주제인 '개인의 한계 돌파'를 서비스 사용자와 개발자(참가자) 모두에게 실현하는 가장 강력한 접근법이 될 것이다.

### Citations
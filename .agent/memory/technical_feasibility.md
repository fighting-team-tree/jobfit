# Part 1. 기술 타당성 조사 및 핵심 솔루션 연구

## 1. 서론: 개인의 성장을 가속화하는 AI의 새로운 패러다임

### 1.1 배경: 'AI for Personal Impact'의 정의와 채용 시장의 비대칭성
현대 사회에서 기술의 발전은 거시적인 생산성 향상을 주도해왔으나, 개개인의 삶에 미치는 구체적이고 실질적인 영향력(Personal Impact)에 대한 논의는 상대적으로 부족했다. 특히 채용 시장은 정보의 비대칭성이 가장 극명하게 드러나는 분야 중 하나다. 기업은 지원자 추적 시스템(ATS)과 AI 기반 이력서 필터링 도구를 통해 효율적으로 선별하는 반면, 구직자는 구체적인 피드백 없이 불확실성과 싸워야 한다.

'Career Impact Agent'는 거대 기업만이 소유했던 고도화된 AI 분석 및 추론 능력을 개인에게 제공하여, 구직자가 자신의 역량을 객관적으로 진단하고(Diagnosis), 부족한 부분을 전략적으로 보완하며(Gap Analysis), 실전과 유사한 환경에서 훈련(Simulation)할 수 있게 한다.

### 1.2 연구의 목적 및 범위
본 문서는 JobFit 서비스의 기술적 타당성을 검증하고, 해커톤 환경에서 구현하기 위한 실행 전략을 수립한다.

**핵심 연구 범위:**
1. **심층 문서 이해(Document Intelligence):** NVIDIA VLM(Nemotron Parse 1.1)을 활용한 이력서/포트폴리오 구조적 파싱.
2. **실시간 대화 시스템(Real-time Conversational AI):** ElevenLabs SDK를 활용한 초저지연 음성 인터페이스.
3. **지능형 추론 및 갭 분석(Reasoning & Gap Analysis):** LLM 프롬프트 엔지니어링과 Repo Map을 통한 코드 분석.
4. **자동화 워크플로우(Workflow Automation):** Replit 배포 및 Calendar/Messenger 연동.

---

## 2. 모듈 1: NVIDIA VLM 기반의 차세대 이력서 파싱

### 2.1 기존 OCR 한계와 VLM 도입
기존 OCR이나 텍스트 추출 라이브러리는 2단 레이아웃, 표, 시각적 계층 구조가 포함된 이력서의 맥락을 파악하는 데 한계가 있다. 이를 극복하기 위해 이미지와 텍스트를 동시에 이해하는 NVIDIA Nemotron Parse 1.1을 도입한다.

### 2.2 NVIDIA Nemotron Parse 1.1 분석
- **Vision Encoder (ViT-H):** 600M 파라미터. 레이아웃과 디자인 요소를 직관적으로 인식.
- **Decoder (mBART-based):** 250M 파라미터. 텍스트 생성 및 구조화.
- **NoPE (No Positional Encoding):** 긴 문서 처리 시 시퀀스 제약 극복.

### 2.3 데이터 큐레이션 (NVIDIA NeMo Curator)
- **PII 마스킹:** 전화번호, 이메일 등을 토큰으로 치환하여 보안 리스크 제거.

---

## 3. 모듈 2: 실시간 대화형 면접 시스템 (ElevenLabs)

### 3.1 Latency 최소화
면접의 몰입감을 위해 지연 시간을 500ms~1초 이내로 단축해야 한다.

### 3.2 ElevenLabs Conversational AI 아키텍처
- **WebSocket Full-duplex:** STT -> LLM -> TTS 파이프라인을 단일 연결로 통합.
- **Streaming:** 첫 토큰 생성 즉시 오디오 합성을 시작하여 체감 지연 시간 단축.

### 3.3 턴테이킹(Turn-taking)
- **Barge-in:** 사용자가 말을 끊거나 끼어들 때 VAD(Voice Activity Detection)가 즉시 반응하여 청취 모드로 전환.

---

## 4. 모듈 3: 동적 기술 역량 분석 (Logic & Reasoning)

### 4.1 GitHub 리포지토리 분석
- **Aider's Repo Map:** Tree-sitter로 AST 변환 -> 참조 관계 그래프 모델링(PageRank) -> 핵심 컨텍스트 압축 추출.

### 4.2 흐름
- 사용자 코드 스타일 및 기술 부채 파악 -> JD 요구사항과 비교 -> 구체적인 기술 보완 로드맵 생성.

---

## 5. 모듈 4: Replit 기반 워크플로우

### 5.1 Replit Deployment
- Reserved VM 사용 (WebSocket 연결 유지).
- 'Always On'으로 백그라운드 작업 수행.

### 5.2 외부 연동
- **Google Calendar:** 학습 일정 자동 등록.
- **Discord/Slack:** 알림봇 연동.

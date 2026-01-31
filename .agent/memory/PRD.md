# JobFit PRD (Product Requirements Document)

## 1. 서비스 개요 (Service Overview)
- **서비스명:** Career Impact Agent (CIA)
- **슬로건:** "AI로 발견하는 나의 빈틈, 데이터로 채우는 커리어 성장"
- **핵심 가치:** 막막한 취업 준비 과정을 데이터 기반의 '진단-훈련-보완' 루프(Loop)로 전환하여 구직자의 효능감과 실제 합격률을 증대시킴.

## 2. 타겟 유저 페르소나 (Target Personas)
- **Persona A (The Blind Spotter):** 열심히 준비했지만 계속 서류/면접에서 탈락하며, 자신의 구체적인 탈락 원인을 모르는 주니어 개발자.
- **Persona B (The Stagnant):** 이직을 원하지만 현재 트렌드 대비 자신의 기술 부채(Technical Debt)가 얼마나 쌓였는지 파악하지 못하는 3~5년 차 개발자.

## 3. 핵심 기능 요구사항 (Functional Requirements)

| **기능 모듈** | **필수 기능 (Must-Have)** | **구현 기술** |
| --- | --- | --- |
| **1. 역량 진단** | • PDF/이미지 이력서 업로드 및 구조적 파싱<br>• GitHub 레포지토리 연동 및 코드 스타일 분석<br>• 채용공고(JD) 링크 파싱 및 핵심 키워드 추출 | • **NVIDIA Nemotron Parse** (VLM)<br>• GitHub API + Tree-sitter (Repo Map) |
| **2. 갭 분석** | • '이력서 vs JD' 매칭 점수 산출<br>• 기술적 약점(Missing Skills) 도출<br>• 맹점(Blind Spot) 리포트 생성 | • LLM (GPT-4o or Claude 3.5)<br>• RAG (Vector DB) |
| **3. 실전 훈련** | • 음성 대화형 기술 면접 (꼬리물기 질문 포함)<br>• 면접 도중 실시간 피드백<br>• 화면 공유(Screen Share) 상황 시뮬레이션 | • **ElevenLabs Conv. AI SDK**<br>• WebSocket Streaming |
| **4. 성장 관리** | • 부족한 역량 보완을 위한 주간 학습 일정 자동 생성<br>• Google Calendar 일정 등록 및 Discord 알림 | • Google Calendar API<br>• Discord Webhook<br>• **Replit Deployment** |

## 4. 주요 성과 지표 (Success Metrics)
- **Latency:** 음성 면접 AI 응답 속도 **800ms 이내**.
- **Parsing Accuracy:** 이력서 섹션 분류 정확도 **95% 이상**.
- **User Impact:** 학습 일정 등록 전환율 (Action Rate).

## 5. Security & Constraints (Critical)
- **Async First:** 이력서 파싱 등 무거운 작업은 BackgroundTasks로 처리.
- **Security:** LLM 전송 전 PII(이메일/전화번호) 마스킹 필수.
- **Latency:** ElevenLabs WebSocket 연결 유지 (Replit Reserved VM 권장).
- **Storage:** ReplitDB 또는 SQLite 사용 (Ephemeral 사용 금지).

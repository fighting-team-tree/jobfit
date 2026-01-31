# UI/UX Design & Flow

## 1. User Journey Map

1. **Onboarding:**
   - 접속 -> 소셜 로그인 -> 이력서 파일 드래그 & 드롭.
2. **Analysis (Magic Moment):**
   - "AI가 당신의 커리어 궤적을 분석 중입니다..." 애니메이션.
   - NVIDIA VLM이 이력서를 읽고, GitHub 코드를 스캔하는 시각적 피드백.
3. **Diagnosis Dashboard:**
   - Radar Chart: 나의 역량 vs JD 요구 역량 비교.
   - Insight Card: 핵심 부족 역량 및 맹점 리포트.
4. **Simulation (Action):**
   - "약점 보완 면접 시작하기" -> ElevenLabs 가상 면접관 등장 -> 실전 압박 면접.
5. **Feedback & Plan:**
   - 면접 종료 후 피드백 리포트 -> 부족한 부분 학습 일정을 Google Calendar에 등록.

## 2. Key Screen Descriptions

### 화면 1: 면접 대기실 (Pre-Interview Setup)
- **Layout:** 중앙 마이크/스피커 테스트. 우측 "오늘의 면접관 페르소나" 카드.
- **Feature:** JD에 따라 면접관 성향 동적 변화 (ElevenLabs Voice Lab).
- **Interaction:** "준비 완료" -> 화면 어두워지며 면접관 아바타 전환.

### 화면 2: 실시간 면접 (Live Interview)
- **Visual:** ElevenLabs 오디오 파형 반응 (Lip-sync 대용). 
  - User Speaking: 'Listening...'
  - AI Speaking: 'Speaking...'
- **Control:** 일시정지, 질문 다시 듣기, 종료 버튼.
- **UX Detail:** 침묵 감지 시 "생각할 시간을 드릴까요?" 툴 트리거.

### 화면 3: 결과 및 로드맵 (Impact Dashboard)
- **Visual:** 타임라인 형태의 학습 계획 시각화 (Weekly View).
- **Integrations:** 
  - "GitHub Issue 생성하기" 버튼.
  - "캘린더 등록하기" 버튼.

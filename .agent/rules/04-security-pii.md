# Security & PII Rules

## 1. PII 마스킹 필수
- LLM(NVIDIA NIM, OpenAI/Gemini 호환 API 등), 외부 분석 도구, 로그 등으로 사용자 데이터를 전송하기 전에 Personally Identifiable Information (PII)를 반드시 마스킹합니다.
- **마스킹 대상:**
  - 이메일 주소
  - 전화번호
  - 주민등록번호 등 고유 식별 정보
  - 주소 및 민감한 경력 세부 정보 (필요 시)
- **마스킹 형식:**
  - 이메일: `[EMAIL_REDACTED]`
  - 전화번호: `[PHONE_REDACTED]`

## 2. 구현 전략
- Regex 기반 마스킹을 사용하여 성능과 신뢰성을 확보합니다.
- LLM의 자체 검열이나 정보 정제 성능에 의존하지 않고 전송 전에 가공합니다.
- 백그라운드 작업 완료 후 임시 텍스트 파일 등은 즉시 메모리/파일시스템에서 정리합니다.

## 3. 비밀 정보 보호 및 .env 직접 접근 금지
- `.env`, API key, OAuth token, JWT secret, credential 파일은 절대 커밋하지 않습니다.
- **AI 에이전트의 직접 .env 조회 금지**: AI 에이전트는 기밀 유출 방지를 위해 실젯값이 포함된 `.env` 파일을 직접 열거나 읽지 않아야 합니다.
- `.env`는 로컬 개발 전용이며, 공유를 위해서는 `.env.example`만 버전 관리 문서로 유지합니다.

### 환경 변수 불일치 해소 프로세스
- `.env.example`과 `.env` 간의 누락이나 불일치가 의심될 경우, 에이전트는 `config.py` 구성 및 `.env.example`을 분석하여 누락된 변수 키 목록을 식별합니다.
- 식별된 누락 변수 목록은 사용자에게 안내하여, 사용자가 직접 수동으로 `.env` 파일에 추가하거나 업데이트하도록 조치합니다. (AI 에이전트가 직접 `.env` 파일을 쓰거나 열어보지 않음)

## 4. 네트워크 및 스크래핑 안전성 (SSRF 방어)
- JD URL 스크래핑 시 SSRF 방어를 엄격하게 준수합니다.
- `localhost`, private IP, link-local, cloud metadata endpoint에 대한 접근을 차단합니다.
- 리디렉션(Redirect)이 발생한 경우에도 최종 목적지 URL에 대해 안전성 검사를 거치도록 보장합니다.

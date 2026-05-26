# Security & PII Rules

## PII 마스킹

LLM, NVIDIA, OpenAI/Gemini 호환 API, 로그, 외부 분석 도구로 사용자 데이터를 보내기 전에 PII를 마스킹합니다.

대상:
- 이메일 주소
- 전화번호
- 주민등록번호 등 고유 식별자
- 주소 및 민감한 경력 세부정보는 필요 시 추가 마스킹

형식:
- 이메일: `[EMAIL_REDACTED]`
- 전화번호: `[PHONE_REDACTED]`

## 비밀정보

- `.env`, API key, OAuth token, JWT secret, credential 파일은 커밋하지 않습니다.
- **AI 에이전트 직접 읽기 금지**: AI 에이전트는 기밀 정보 보호를 위해 실젯값이 포함된 `.env` 파일을 직접 열거나 읽지 않아야 합니다.
- `.env.example`에는 값이 아닌 변수명과 설명만 둡니다.
- 로그/테스트 출력에 secret 원문을 남기지 않습니다.

### 환경 변수 불일치 해소 프로세스
- `.env.example`과 `.env` 간의 불일치가 의심될 경우(예: 설정 오류, 누락된 키), 에이전트는 `config.py` 구성 및 `.env.example`을 대조 분석하여 누락되거나 맞지 않는 환경 변수 키 목록을 식별합니다.
- 식별된 누락/불일치 항목은 사용자에게 직접 제공하여 사용자가 직접 `.env` 파일에 추가 및 수정하도록 안내합니다. (AI 에이전트가 `.env` 파일을 직접 수정하거나 열어보지 않음).

## 네트워크/스크래핑

- JD URL 스크래핑은 SSRF 방어를 유지합니다.
- localhost, private IP, link-local, metadata endpoint 접근을 차단합니다.
- redirect 후 최종 URL도 안전성 검사를 통과해야 합니다.

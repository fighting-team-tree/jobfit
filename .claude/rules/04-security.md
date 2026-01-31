# 보안 & PII 규칙

## 1. PII 마스킹 필수
LLM(NVIDIA NIM, Claude 등)에 데이터 전송 전 **반드시** PII 마스킹 처리

### 마스킹 대상
- 이메일 주소
- 전화번호
- 주민등록번호
- 주소 (권장)

### 마스킹 형식
```
이메일: john@gmail.com → [EMAIL_REDACTED]
전화번호: 010-1234-5678 → [PHONE_REDACTED]
```

## 2. 구현 전략
- Regex 기반 마스킹 사용 (성능 및 신뢰성)
- LLM 자체 검열에 의존하지 않음

## 3. 데이터 처리
- 마스킹되지 않은 PII는 로그에 저장 금지
- 백그라운드 작업 후 임시 파일 즉시 삭제

## 4. API 키 관리
- 모든 API 키는 `.env` 파일에서 관리
- `.env`는 절대 커밋하지 않음 (`.gitignore` 포함)
- 환경 변수 예시:
  ```
  NVIDIA_API_KEY=...
  ANTHROPIC_API_KEY=...
  ELEVENLABS_API_KEY=...
  ```

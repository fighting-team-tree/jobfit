# JD 스크래핑 테스트

채용공고 URL에서 JD를 스크래핑하는 API를 테스트합니다.

## 테스트 명령어
```bash
curl -X POST http://localhost:8000/api/v1/analyze/jd/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/job-posting"}'
```

## 지원 사이트
- 원티드 (wanted.co.kr)
- 로켓펀치 (rocketpunch.com)
- 토스 (toss.im/career)
- 네이버 채용
- 대부분의 채용 사이트

## 확인 사항
- Backend 서버가 실행 중이어야 합니다
- Playwright 브라우저 설치: `uv run playwright install chromium`

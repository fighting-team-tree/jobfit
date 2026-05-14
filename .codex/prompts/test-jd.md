# Test JD Scraper Prompt

JD URL 스크래핑 API를 테스트한다. 서버가 `http://localhost:8000`에서 실행 중이어야 한다.

```bash
curl -X POST http://localhost:8000/api/v1/analyze/jd/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/job"}'
```

SSRF 방어 확인 시 localhost/private IP URL은 차단되어야 한다.

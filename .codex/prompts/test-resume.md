# Test Resume Prompt

이력서 파일 분석 API를 테스트한다. 서버가 `http://localhost:8000`에서 실행 중이어야 한다.

```bash
curl -X POST http://localhost:8000/api/v1/analyze/resume/file \
  -F "file=@data/sample_resume.pdf"
```

실제 이력서/PII가 포함된 파일은 로그와 커밋에 남기지 않는다.

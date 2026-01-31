# 이력서 분석 테스트

이력서 파일을 분석하는 API를 테스트합니다.

## 파일 분석 테스트
```bash
curl -X POST http://localhost:8000/api/v1/analyze/resume/file \
  -F "file=@data/sample_resume.pdf"
```

## 텍스트 분석 테스트
```bash
curl -X POST http://localhost:8000/api/v1/analyze/resume \
  -H "Content-Type: application/json" \
  -d '{"text": "이력서 텍스트 내용..."}'
```

## 확인 사항
- Backend 서버가 실행 중이어야 합니다
- `data/` 디렉토리에 샘플 이력서 파일이 있는지 확인하세요

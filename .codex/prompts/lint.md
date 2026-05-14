# Lint Prompt

프로젝트 린트를 실행하고 실패 시 수정한다.

```bash
make lint
npm --prefix client run lint
```

Backend만 바뀌면 `make lint`, Frontend만 바뀌면 `npm --prefix client run lint`를 우선한다.

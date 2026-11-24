# Loki

## 로그 보존 기간(retention) 설정 확인

```bash
cat /etc/loki/loki.yaml | grep retention
```

- **언제**: Loki 로그가 언제 지워지는지, 아니면 무제한으로 쌓이는지 확인할 때
- **주의**: Loki 파드 안에서 실행한다(`kubectl exec`). 설정 파일 경로는 설치 방식에 따라 다르다. 컨테이너 실행 인자의 `-config.file=` 값을 보면 알 수 있다
- **주의**: `retention_deletes_enabled: false`와 `retention_period: 0s`가 나오면 삭제가 꺼져 있고 보존 기간도 무제한이다. 이 두 항목은 예전 방식인 `table_manager`의 설정이다
- **주의**: 파일에 적히지 않은 항목은 기본값으로 동작한다. compactor 방식의 `retention_enabled`는 grep에 안 나와도 기본값 `false`로 꺼져 있다

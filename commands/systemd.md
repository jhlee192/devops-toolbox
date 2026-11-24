# systemd / journalctl

## 서비스 로그를 시간 범위로 잘라내기

```bash
journalctl -u <service> \
  --since '<since>' \
  --until '<until>' \
  --no-pager > out.log
```

- **언제**: 장애 발생 시각을 아는 상태에서 그 구간만 떼어내 분석할 때
- **주의**: `--no-pager`를 빠뜨리면 파일로 리다이렉트할 때 페이저에 걸려 멈춘다
- **주의**: 시각 형식은 `'YYYY-MM-DD HH:MM'` (예: `'2026-09-16 19:10'`). 따옴표 필수
- **연관**: 상대 시간도 된다 — `--since '30 min ago'`, `--since yesterday`

## 서비스 로그 실시간 확인

```bash
journalctl -u <service> -f
```

- **언제**: 조치를 넣고 반응을 바로 보고 싶을 때
- **연관**: `-n 100`으로 최근 줄부터 시작 — `journalctl -u <service> -n 100 -f`

## 특정 우선순위 이상만 보기

```bash
journalctl -u <service> -p warning --since today --no-pager
```

- **언제**: 로그가 많아 WARNING/ERROR만 걸러내고 싶을 때
- **주의**: `-p`는 지정 레벨 **이상**을 포함한다. `warning`이면 warning/err/crit/alert/emerg

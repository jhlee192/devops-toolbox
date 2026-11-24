# Linux 프로세스·커널

## D state로 멈춘 프로세스 찾기

```bash
for f in /proc/[0-9]*/stat; do
  s=$(timeout 1 cat $f 2>/dev/null) || continue
  set -- $s; [ "$3" = D ] && echo "$1 $2 D"
done
```

- **언제**: `ps`, `top`, `pgrep`, `kubectl exec`가 응답 없이 멈출 때. 커널 안에서 대기하다 깨어나지 못한 프로세스가 있는지 찾는다
- **주의**: D state(uninterruptible sleep)는 I/O나 커널 락을 기다리는 상태라 `kill -9`로도 죽지 않는다. 기다리는 대상이 끝내 안 풀리면 재부팅해야 정리된다
- **주의**: `ps`가 멈추는 이유는 이런 프로세스의 `/proc/<pid>/cmdline`을 읽으려다 같은 메모리 락에 걸리기 때문이다. `/proc/<pid>/stat`은 그 락 없이 읽혀서 이 방법은 멈추지 않는다. `timeout 1`은 혹시 걸려도 1초 뒤 넘어가게 하는 안전장치다
- **주의**: `stat`의 2번째 칸이 `(프로세스명)`, 3번째 칸이 상태 문자다. 프로세스명에 공백이 있으면 칸이 밀린다
- **연관**: 어디서 멈췄는지는 `sudo cat /proc/<pid>/stack`

## 프로세스가 커널 어디서 멈췄는지 보기

```bash
sudo cat /proc/<pid>/stack
cat /proc/<pid>/wchan; echo
awk '/^(State|VmRSS|Threads)/' /proc/<pid>/status
```

- **언제**: D state 프로세스가 무엇을 기다리는지 가릴 때. 디스크·NFS I/O인지, 메모리 관리 쪽 락인지
- **주의**: `stack`은 root 권한이 필요하다. 맨 위 함수가 대기 지점이다. 스택의 함수 이름으로 커널 버그 리포트를 검색할 수 있다
- **주의**: `wchan`이 0이어도 `stack`에는 내용이 나올 수 있다
- **주의**: 스택에 `nfs_`, `rpc_`가 있으면 NFS 서버 응답 대기, `migration_entry_wait`나 `collapse_huge_page`는 메모리 페이지 이동이나 THP(huge page 자동 병합) 쪽 대기다

## 프로세스 시작 시각 확인

```bash
sudo ls -ld --time-style=+%F_%T /proc/<pid>
```

- **언제**: `ps`가 멈춰서 쓸 수 없을 때, 멈춘 프로세스가 언제부터 떠 있었는지 볼 때
- **주의**: `/proc/<pid>` 디렉터리의 시각은 프로세스가 만들어진 시각으로 쓸 수 있다. `--time-style=+%F_%T`는 `2026-01-01_12:00:00` 형식으로 보여준다

## THP(Transparent Huge Page) 설정 확인

```bash
cat /sys/kernel/mm/transparent_hugepage/enabled /sys/kernel/mm/transparent_hugepage/defrag
```

- **언제**: Redis·DB 같은 메모리 집약 프로세스가 지연되거나, `khugepaged`가 D state일 때
- **주의**: 대괄호로 감싼 값이 현재 설정이다. `[always]`면 커널이 4KB 페이지를 2MB 단위로 자동 병합한다. 병합하려고 페이지를 옮기는 동안 그 메모리를 쓰는 프로세스가 기다린다
- **주의**: Redis는 공식 문서에서 THP를 끄라고 권장한다

## 커널 메시지에서 hung task·OOM 찾기

```bash
sudo dmesg -T | grep -iE 'hung_task|blocked for more|oom|<pattern>' | tail -20
```

- **언제**: 프로세스가 멈췄거나 죽었을 때 커널이 남긴 경고를 볼 때
- **주의**: `-T`는 사람이 읽는 시각으로 바꿔 보여준다. 다만 서스펜드 등이 있었으면 시각이 어긋날 수 있다
- **주의**: 결과가 비어 있어도 문제가 없다는 뜻은 아니다. hung task 경고는 `kernel.hung_task_timeout_secs`(기본 120초)를 넘겨야 찍히고, 링 버퍼가 차면 오래된 메시지는 사라진다

## conntrack 테이블 사용량 확인

```bash
sudo cat /proc/sys/net/netfilter/nf_conntrack_count /proc/sys/net/netfilter/nf_conntrack_max
```

- **언제**: UDP(DNS 등) 패킷이 간헐적으로 사라질 때 연결 추적 테이블이 꽉 찼는지 볼 때
- **주의**: 첫 줄이 현재 개수, 둘째 줄이 최대값이다. 최대값에 가까우면 새 연결이 버려지고 dmesg에 `nf_conntrack: table full`이 찍힌다

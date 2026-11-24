# Prometheus / PromQL

## 삭제된 Pod의 재시작 횟수 확인

```promql
max_over_time(kube_pod_container_status_restarts_total{namespace="<namespace>", pod=~"<deployment>-[^-]+-[^-]+"}[7d])
```

- **언제**: Pod가 이미 지워져 `kubectl get pod`로는 못 보는 재시작 이력을 사후에 확인할 때
- **주의**: `[7d]` 같은 range vector가 핵심이다. 셀렉터만 쓰면 살아있는 Pod만 나온다 — kube-state-metrics가 삭제된 Pod의 시계열을 stale 처리하는데, staleness는 instant vector에만 적용되기 때문
- **주의**: Grafana 시간 범위를 `[7d]`와 맞춰야 한다. Last 1 hour인 채로 `[7d]`를 써도 1시간 구간만 평가된다
- **주의**: Grafana Explore 기준 Type `Instant` + Format `Table`. restartCount는 단조 증가라 최댓값이 곧 삭제 직전 최종 횟수다
- **주의**: `pod=~"<deployment>-.*"`로 하면 이름이 겹치는 다른 Deployment까지 딸려온다. `-[^-]+-[^-]+`는 `<deployment>-<RS해시>-<Pod해시>` 형태에만 맞춘 패턴 (PromQL 정규식은 양끝이 자동 앵커링)
- **연관**: kube-state-metrics v1.x는 레이블이 `pod_name`/`container_name`이다. 빈 결과면 레이블명부터 확인

## 재시작이 발생한 컨테이너만 추리기

```promql
max_over_time(kube_pod_container_status_restarts_total{namespace="<namespace>"}[7d]) > 0
```

- **언제**: 네임스페이스 전체에서 재시작을 겪은 컨테이너만 훑을 때
- **주의**: PromQL의 비교 연산자는 기본이 **필터**다. 조건에 안 맞는 시계열은 결과에서 빠진다
- **연관**: 전수 확인은 `> 0`을 떼면 된다

## 컨테이너의 마지막 종료 사유 확인

```promql
max_over_time(kube_pod_container_status_last_terminated_reason{namespace="<namespace>", pod=~"<deployment>-[^-]+-[^-]+"}[7d]) > 0
```

- **언제**: 재시작이 OOM 때문인지 프로세스 에러인지 가를 때
- **주의**: **값은 항상 1이다.** 재시작 횟수가 아니다. 정보는 `reason` 레이블(`OOMKilled` / `Error` / `Completed`)에 있다
- **주의**: 이름 그대로 **마지막** 종료 사유만 남는다. 여러 번 재시작하며 사유가 바뀌었다면 중간 이력은 안 보인다
- **연관**: 횟수는 `kube_pod_container_status_restarts_total`로 따로 본다

## Pod 기동 시각 확인

```promql
max_over_time(kube_pod_start_time{namespace="<namespace>", pod="<pod>"}[7d])
```

- **언제**: 삭제된 Pod가 언제부터 떠 있었는지 알아야 할 때
- **주의**: 값이 Unix epoch(초)다. Grafana에서 Unit을 `Time > Datetime (from seconds)`로 바꾸거나 `date -r <epoch>` (리눅스는 `date -d @<epoch>`)로 변환
- **연관**: Type `Range` + Format `Time series`로 그리면 값이 상수라 수평선이 된다. **선의 시작과 끝이 곧 Pod 생존 구간**이라 epoch 변환 없이 X축에서 바로 읽힌다

## Pod가 사라진 시각 확인

```promql
max_over_time(timestamp(kube_pod_info{namespace="<namespace>", pod="<pod>"})[7d:1m])
```

- **언제**: Pod가 언제 삭제됐는지 역산할 때
- **주의**: `[7d:1m]`은 subquery다. "지난 7일을 1분 간격으로 되짚으며 안쪽 표현식을 평가"한다는 뜻. `timestamp()`가 instant vector용이라 삭제된 Pod에 직접 못 쓰는 걸 이 형태로 우회한다
- **주의**: 결과는 메트릭이 마지막으로 수집된 시각이다. 정밀도는 스크랩 주기(보통 30s) 수준
- **주의**: 결과가 현재 시각과 거의 같으면 그 Pod는 아직 살아있는 것이다
- **연관**: `kube_pod_info`는 값이 1인 info 메트릭. `created_by_name` 레이블로 소유 ReplicaSet을 확인할 수 있어 Pod 이름 패턴 검증에도 쓴다

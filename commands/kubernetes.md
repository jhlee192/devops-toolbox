# Kubernetes

## Pod UID로 어떤 Pod인지 찾기

```bash
crictl pods --label io.kubernetes.pod.uid=<pod-uid>
```

- **언제**: 노드의 `/var/lib/kubelet/pods/<pod-uid>` 디렉터리가 어느 Pod의 것인지 알아내야 할 때. 디렉터리 이름이 Pod UID다
- **주의**: 노드에서 실행한다. kubectl 권한이 없어도 컨테이너 런타임에 직접 물어볼 수 있다. 출력의 NAME, NAMESPACE 열로 Pod를 특정한다
- **주의**: `--label`은 kubelet이 Pod sandbox에 붙여 둔 라벨로 거른다. `io.kubernetes.pod.uid`가 그 라벨 중 하나다
- **주의**: 결과가 비어 있으면 이미 지워진 Pod가 남긴 디렉터리(orphan)일 수 있다

## Pod 이름으로 UID 확인

```bash
kubectl -n <namespace> get pod <pod> -o jsonpath='{.metadata.uid}{"\n"}'
```

- **언제**: 특정 Pod의 kubelet 디렉터리(`/var/lib/kubelet/pods/<pod-uid>`)를 노드에서 찾아가야 할 때
- **주의**: `{"\n"}`를 빼면 줄바꿈 없이 출력되어 프롬프트가 같은 줄에 붙는다
- **주의**: Pod를 삭제하고 다시 만들면(rollout, eviction 등) UID가 바뀐다. 컨테이너 재시작만으로는 바뀌지 않는다
- **연관**: 반대로 UID에서 Pod를 찾을 때는 `crictl pods --label io.kubernetes.pod.uid=<pod-uid>`

## 네임스페이스의 Pod UID와 노드 한 번에 보기

```bash
kubectl -n <namespace> get pods -o custom-columns=NAME:.metadata.name,UID:.metadata.uid,NODE:.spec.nodeName
```

- **언제**: 여러 Pod의 UID를 훑어보거나, 어느 노드의 kubelet 디렉터리를 봐야 하는지 같이 알아야 할 때
- **주의**: `custom-columns`는 `헤더:JSON경로`를 쉼표로 이어 쓴다. 쉼표 앞뒤에 공백을 넣으면 안 된다

## 노드에서 crictl로 Pod UID 확인

```bash
crictl pods --name <pod> -o json | grep '"io.kubernetes.pod.uid"'
```

- **언제**: kubectl 권한 없이 노드에서 Pod의 UID를 알아야 할 때
- **주의**: 기본 표 출력에는 UID가 없다. `-o json`으로 라벨까지 출력해야 보인다
- **주의**: `--name`은 정확히 일치하는 이름만이 아니라 패턴으로 거른다. 이름이 비슷한 Pod가 여러 개 걸릴 수 있다
- **연관**: Pod ID를 이미 알면 `crictl inspectp <pod-id> | grep -m1 '"uid"'`

## cri-o 이미지 저장소 경로 확인

```bash
sudo crio config 2>/dev/null | grep -E '^\s*(root|runroot|storage_driver) '
```

- **언제**: cri-o가 이미지를 어디에 저장하는지 알아야 할 때. skopeo나 podman으로 노드의 이미지를 직접 다룰 때 필요하다
- **주의**: `crio config`는 현재 적용된 cri-o 설정 전체를 출력한다. `2>/dev/null`은 부가 로그를 숨긴다
- **주의**: `root`는 이미지 저장 경로, `runroot`는 실행 상태 경로, `storage_driver`는 스토리지 드라이버다. `storage_driver` 줄이 없으면 기본값(overlay)이다
- **연관**: 기본 경로(`/var/lib/containers/storage`)가 아니면 skopeo에 경로를 직접 넣어야 한다. [skopeo](skopeo.md#cri-o-노드에-있는-이미지를-레지스트리로-push)

## CoreDNS 로그에서 업스트림 timeout 찾기

```bash
kubectl -n kube-system logs -l k8s-app=kube-dns --timestamps --prefix --tail=500 | grep -i timeout
```

- **언제**: Pod에서 DNS 조회가 실패하거나 느릴 때, CoreDNS가 업스트림 DNS로 넘긴 질의가 응답을 못 받는지 볼 때
- **주의**: `-l k8s-app=kube-dns`는 CoreDNS Pod를 라벨로 고른다(Deployment 이름이 coredns여도 라벨은 kube-dns). `--prefix`는 줄마다 어느 Pod 로그인지, `--timestamps`는 언제 난 에러인지 붙인다. 시각이 없으면 지금도 나는 에러인지 과거 에러인지 구분이 안 된다
- **주의**: 라벨로 여러 Pod를 고르면 `--tail` 기본값이 Pod당 10줄로 줄어든다. 넉넉히 지정한다
- **주의**: 로그 형식은 `read udp <coredns-pod-ip>:<port>-><upstream-ip>:53: i/o timeout`이다. 질의 이름과 레코드 타입(A/AAAA), 어느 업스트림인지가 같이 찍힌다
- **주의**: 기동 직후 `<숫자>.<숫자>. HINFO` 질의가 timeout이면 loop 플러그인의 자가 점검 질의다. 이것까지 실패하면 업스트림 전체가 안 닿는 상태다
- **연관**: Corefile 확인은 `kubectl -n kube-system get cm coredns -o jsonpath='{.data.Corefile}'`

## CoreDNS 설정(Corefile) 확인

```bash
kubectl -n kube-system get cm coredns -o jsonpath='{.data.Corefile}'
```

- **언제**: CoreDNS가 외부 질의를 어디로 넘기는지(forward), hosts 항목이 있는지 볼 때
- **주의**: `forward . /etc/resolv.conf`는 노드의 `/etc/resolv.conf`가 아니라 **CoreDNS Pod 안의** resolv.conf를 읽는다. CoreDNS는 `dnsPolicy: Default`라 kubelet이 Pod 생성 시점에 노드 파일(kubelet `resolvConf` 설정)을 복사해 넣는다. 노드 파일을 고쳐도 CoreDNS를 재시작해야 반영된다
- **연관**: kubelet이 어떤 파일을 넘기는지는 `sudo grep -iE 'resolvConf|clusterDNS|clusterDomain' -A2 /var/lib/kubelet/config.yaml`

## kubelet의 DNS 설정 확인

```bash
sudo grep -iE 'resolvConf|clusterDNS|clusterDomain' -A2 /var/lib/kubelet/config.yaml
```

- **언제**: Pod의 resolv.conf가 어디서 오는지, 클러스터 DNS IP와 도메인이 무엇인지 노드에서 볼 때
- **주의**: `-A2`는 맞은 줄 뒤로 2줄 더 보여준다. `clusterDNS`는 값이 다음 줄에 목록(`- 10.x.x.x`)으로 오기 때문에 필요하다
- **주의**: `resolvConf` 줄이 없으면 기본값 `/etc/resolv.conf`를 쓴다. systemd-resolved를 쓰는 배포판에서 이 파일의 nameserver가 `127.0.0.53`이면 Pod 안에서는 자기 자신을 가리켜 DNS가 안 된다

## 임시 Pod로 DNS 경로 비교

```bash
kubectl run dnstest-tmp --rm -i --restart=Never --image=<image> --image-pull-policy=IfNotPresent -- \
  sh -c "cat /etc/resolv.conf; nslookup <name> <upstream-ip>; nslookup <name> <cluster-dns-ip>"
```

- **언제**: Pod 네트워크에서 업스트림 DNS로 바로 질의하는 경우와 CoreDNS를 거치는 경우를 나란히 비교할 때. 어느 구간이 막혔는지 가른다
- **주의**: `--rm -i --restart=Never`는 명령이 끝나면 Pod를 지우는 일회성 실행이다. `-i`가 없으면 출력을 못 받는다
- **주의**: `--image-pull-policy=IfNotPresent`는 노드에 이미 있는 이미지를 쓴다. 외부망이 막힌 클러스터에서는 노드에 있는 busybox 같은 이미지를 골라야 뜬다
- **주의**: `nslookup <name> <server>`처럼 서버를 지정하면 Pod의 resolv.conf를 거치지 않고 그 서버로 바로 질의한다. busybox nslookup은 A와 AAAA를 같이 물어서, AAAA가 없으면 `Can't find ... No answer`가 함께 찍힌다. A 결과가 나왔으면 정상이다
- **주의**: 손으로 하는 질의는 이름 하나만 물어본다. 실제 앱은 search 도메인을 붙인 이름과 AAAA까지 여러 번 묻기 때문에, 이게 성공해도 앱 쪽 질의는 실패할 수 있다
- **연관**: 노드에 있는 이미지 목록은 `sudo crictl images | grep -iE 'busybox|dnsutil|netshoot'`

## 노드에 이미 있는 이미지 찾기

```bash
sudo crictl images | grep -iE '<pattern>'
```

- **언제**: 외부망이 막힌 클러스터에서 디버그용 Pod를 띄울 이미지를 고를 때
- **주의**: 컨테이너 런타임(containerd, cri-o)에 직접 묻는 것이라 노드별로 결과가 다르다. Pod가 다른 노드에 뜨면 그 노드에도 이미지가 있어야 한다
- **연관**: 고른 이미지는 `--image-pull-policy=IfNotPresent`로 띄운다

## Pod 컨테이너별 준비 상태·재시작·직전 종료 사유 보기

```bash
kubectl -n <namespace> get pod <pod> -o jsonpath='{range .status.containerStatuses[*]}{.name} ready={.ready} restarts={.restartCount} {.lastState.terminated.reason} {.lastState.terminated.exitCode}{"\n"}{end}'
```

- **언제**: `2/3 Running`처럼 일부 컨테이너만 안 뜰 때, 어느 컨테이너가 몇 번 왜 죽었는지 한 줄씩 볼 때
- **주의**: `{range ...}{end}`는 목록을 돌며 반복 출력한다. `{"\n"}`가 없으면 한 줄에 다 붙는다
- **주의**: 종료 사유가 `Completed`, exit 0인데 재시작이 계속되면 프로세스가 스스로 죽은 게 아니라 liveness probe 실패로 kubelet이 내린 것일 수 있다. 이벤트를 같이 본다
- **연관**: 이전 컨테이너 로그는 `kubectl -n <namespace> logs <pod> -c <container> --previous`

## 재시작 전 컨테이너 로그 보기

```bash
kubectl -n <namespace> logs <pod> -c <container> --previous --tail=50
```

- **언제**: 컨테이너가 재시작을 반복할 때, 죽기 직전에 무엇을 찍었는지 볼 때
- **주의**: `-c`는 멀티 컨테이너 Pod에서 필수다. 빠뜨리면 컨테이너를 고르라는 에러가 난다
- **주의**: `--previous`는 직전 한 번의 컨테이너 로그만 남아 있다. 그보다 이전 로그는 없다
- **주의**: 로그가 특정 줄에서 멈추고 아무것도 안 찍힌다면 프로세스가 멈춰 있는(hang) 것일 수 있다. 이때는 `kubectl exec`도 멈출 수 있으니 노드에서 프로세스 상태를 본다. [linux](linux.md#d-state로-멈춘-프로세스-찾기)

## 네임스페이스 이벤트를 시간순으로 보기

```bash
kubectl -n <namespace> get events --sort-by=.lastTimestamp | tail -20
```

- **언제**: probe 실패, 재시작, 스케줄링 실패처럼 Pod에 무슨 일이 있었는지 최근 순서로 볼 때
- **주의**: 기본 출력은 시간순이 아니다. `--sort-by=.lastTimestamp`로 정렬해야 맨 아래가 최신이다
- **주의**: 이벤트는 보통 1시간 정도만 보관된다. 오래된 일은 안 보인다
- **주의**: `Readiness probe failed:` 뒤에 내용이 비어 있으면 probe 명령이 출력 없이 timeout 났다는 뜻일 수 있다

## 컨테이너 probe·리소스 설정 보기

```bash
kubectl -n <namespace> get <kind> <name> -o jsonpath='{range .spec.template.spec.containers[*]}{.name}: L={.livenessProbe} R={.readinessProbe} RES={.resources}{"\n"}{end}'
```

- **언제**: 컨테이너가 probe 실패로 재시작될 때, probe 명령과 timeout·실패 허용 횟수를 확인할 때
- **주의**: `<kind>`에는 deployment, statefulset, daemonset을 넣는다. Pod를 직접 볼 때는 경로가 `.spec.containers[*]`로 바뀐다
- **주의**: `initialDelaySeconds`, `timeoutSeconds`, `failureThreshold`를 같이 본다. 기동이 느린 앱은 첫 확인 전 대기 시간이 짧으면 계속 재시작된다

## Running이 아닌 Pod만 보기

```bash
kubectl get pod -A --field-selector=status.phase!=Running | grep -v Completed
```

- **언제**: 클러스터 전체에서 문제 있는 Pod만 빠르게 추릴 때
- **주의**: `--field-selector`는 서버 쪽에서 거른다. `status.phase`는 Pending/Running/Succeeded/Failed/Unknown만 갖는다
- **주의**: `CrashLoopBackOff`나 `2/3 Running`인 Pod는 phase가 Running이라 여기 안 걸린다. READY 열을 따로 봐야 한다

## Deployment가 언제 재시작·변경됐는지 보기

```bash
kubectl -n <namespace> get rs -l <label-selector>
kubectl -n <namespace> get deploy <deploy> -o jsonpath='{.spec.template.metadata.annotations}{"\n"}'
```

- **언제**: 에러가 시작된 시점과 Deployment 변경·재시작 시점을 맞춰볼 때
- **주의**: ReplicaSet의 AGE가 각 변경(설정 수정·rollout restart)이 일어난 시각이다. DESIRED가 0인 것은 이전 버전이다
- **주의**: `kubectl rollout restart`를 쓰면 annotation에 `kubectl.kubernetes.io/restartedAt`이 남는다

## PVC가 실제로 어디에 저장되는지 보기

```bash
for pv in $(kubectl -n <namespace> get pvc -o jsonpath='{.items[*].spec.volumeName}'); do
  kubectl get pv $pv -o jsonpath='{.metadata.name} {.spec.storageClassName} {.spec.nfs} {.spec.hostPath} {.spec.local} {.spec.csi.driver}{"\n"}'
done
```

- **언제**: Pod가 I/O에서 멈춘 것 같을 때, 볼륨이 NFS인지 노드 로컬 경로인지 CSI인지 가를 때
- **주의**: 볼륨 종류에 따라 값이 들어가는 필드가 다르다. 해당 없는 필드는 빈 값으로 나온다

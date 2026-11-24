# 상황별 색인

증상이나 목적으로 찾아 들어가는 역색인.
명령어 이름이 기억 안 날 때 여기부터 본다.

## 장애 조사

- **특정 시각의 서비스 로그를 봐야 할 때** → [systemd](commands/systemd.md#서비스-로그를-시간-범위로-잘라내기)
- **조치 넣고 반응을 실시간으로 볼 때** → [systemd](commands/systemd.md#서비스-로그-실시간-확인)
- **로그가 너무 많아 에러만 걸러낼 때** → [systemd](commands/systemd.md#특정-우선순위-이상만-보기)

## 파일 일괄 수정

- **번호 붙은 파일이 1, 10, 2 순서로 나올 때** → [bulk-edit](commands/bulk-edit.md#숫자가-섞인-경로를-숫자-순으로-나열)
- **여러 파일을 순서대로 grep할 때** → [bulk-edit](commands/bulk-edit.md#여러-파일을-숫자-순으로-grep)
- **sed로 고치기 전에 바뀔 줄을 확인할 때** → [bulk-edit](commands/bulk-edit.md#치환-결과-미리보기)
- **여러 파일에서 같은 문자열을 한 번에 지울 때** → [bulk-edit](commands/bulk-edit.md#여러-파일에서-문자열-일괄-삭제)
- **두 줄짜리 블록(YAML 항목 등)을 빼낼 때** → [bulk-edit](commands/bulk-edit.md#특정-줄과-다음-줄을-함께-삭제)
- **sed -i.bak 백업을 정리할 때** → [bulk-edit](commands/bulk-edit.md#sed-백업-파일-일괄-삭제)

## GitLab

- **머지가 "Drum roll" 화면에서 안 넘어갈 때** → [gitlab](commands/gitlab.md#머지-진행-중locked으로-멈춘-mr-찾기)
- **머지·파이프라인이 느릴 때 Sidekiq가 밀렸는지 볼 때** → [gitlab](commands/gitlab.md#sidekiq-사용률과-큐-대기-시간-확인)
- **Sidekiq 스레드를 무엇이 차지하는지 볼 때** → [gitlab](commands/gitlab.md#sidekiq에서-지금-실행-중인-잡-보기)
- **큐에 무슨 잡이 쌓였는지 볼 때** → [gitlab](commands/gitlab.md#큐에-쌓인-잡-종류-집계)
- **Dead 잡이 어떤 에러로 죽는지 볼 때** → [gitlab](commands/gitlab.md#실패-잡dead--retry-원인-집계)
- **특정 워커나 에러를 Sidekiq 로그에서 찾을 때** → [gitlab](commands/gitlab.md#sidekiq-로그에서-특정-문자열-찾기)
- **gitlab.rb와 환경변수를 합친 최종 설정을 볼 때** → [gitlab](commands/gitlab.md#실제-적용된-설정-값-보기)
- **설정 안 한 값이 왜 그렇게 동작하는지 따라갈 때** → [gitlab](commands/gitlab.md#show-config에-안-보이는-기본값-추적)
- **메일이 실제로 켜져 있는지, 어떤 방식으로 나가는지 볼 때** → [gitlab](commands/gitlab.md#rails-설정-값-직접-조회)
- **구성요소가 다 떠 있는지, 최근 재시작됐는지 볼 때** → [gitlab](commands/gitlab.md#서비스-구성요소-상태-확인)
- **스레드·워커 늘리기 전에 DB 커넥션 여유를 볼 때** → [gitlab](commands/gitlab.md#내장-postgresql-커넥션-사용량)
- **"Your account is locked."로 로그인이 안 될 때** → [gitlab](commands/gitlab.md#계정-잠금-상태와-실패-횟수-확인)
- **잠긴 계정(root 포함)을 바로 풀어야 할 때** → [gitlab](commands/gitlab.md#계정-잠금-해제)
- **몇 번 틀리면 잠기는지 볼 때** → [gitlab](commands/gitlab.md#계정-잠금-기준-확인)
- **누가 로그인을 틀렸는지 IP를 찾을 때** → [gitlab](commands/gitlab.md#로그에서-로그인-실패-ip-찾기)
- **로그인 실패 기록을 DB에서 조회할 때** → [gitlab](commands/gitlab.md#인증-이벤트-테이블에서-로그인-실패-ip-조회)
- **Rails 콘솔에서 여러 줄 Ruby를 실행할 때** → [gitlab](commands/gitlab.md#rails-콘솔-열기)
- **번들 Nginx 설정을 고친 뒤 문법을 검사할 때** → [gitlab](commands/gitlab.md#번들-nginx-설정-문법-검사)
- **번들 Nginx 설정을 연결 끊지 않고 반영할 때** → [gitlab](commands/gitlab.md#번들-nginx-설정-무중단-반영)
- **reconfigure·업그레이드 뒤 직접 넣은 Nginx 설정이 사라졌는지 볼 때** → [gitlab](commands/gitlab.md#직접-고친-번들-nginx-설정이-남아-있는지-확인)

## Docker

- **컨테이너 로그가 로테이션되는지 볼 때** → [docker](commands/docker.md#컨테이너-로그-설정-확인)
- **dockerd CPU가 높거나 /var/lib/docker가 커졌을 때** → [docker](commands/docker.md#컨테이너-로그-파일-크기-확인)
- **실행 중인 컨테이너에 들어간 환경변수를 볼 때** → [docker](commands/docker.md#컨테이너-환경변수-확인)
- **daemon.json 고친 뒤 재시작하기 전에** → [docker](commands/docker.md#daemonjson-문법-검사)
- **daemon.json 변경을 반영할 때** → [docker](commands/docker.md#daemonjson-변경-반영-dockerd-재시작)
- **로그 설정·환경변수 바꾼 컨테이너를 다시 만들 때** → [docker](commands/docker.md#compose-컨테이너-재생성)

## Pod 이력 추적

- **Pod가 지워져서 재시작 횟수를 못 볼 때** → [prometheus](commands/prometheus.md#삭제된-pod의-재시작-횟수-확인)
- **네임스페이스에서 재시작 겪은 컨테이너만 훑을 때** → [prometheus](commands/prometheus.md#재시작이-발생한-컨테이너만-추리기)
- **재시작이 OOM 때문인지 확인할 때** → [prometheus](commands/prometheus.md#컨테이너의-마지막-종료-사유-확인)
- **Pod가 언제부터 언제까지 떠 있었는지 알아야 할 때** → [prometheus](commands/prometheus.md#pod-기동-시각-확인)

## Kubernetes

- **/var/lib/kubelet/pods 아래 디렉터리가 어느 Pod 것인지 찾을 때** → [kubernetes](commands/kubernetes.md#pod-uid로-어떤-pod인지-찾기)
- **Pod 이름은 아는데 kubelet 디렉터리(UID)를 찾아야 할 때** → [kubernetes](commands/kubernetes.md#pod-이름으로-uid-확인)
- **여러 Pod의 UID와 떠 있는 노드를 같이 볼 때** → [kubernetes](commands/kubernetes.md#네임스페이스의-pod-uid와-노드-한-번에-보기)
- **kubectl 권한 없이 노드에서 Pod UID를 볼 때** → [kubernetes](commands/kubernetes.md#노드에서-crictl로-pod-uid-확인)
- **cri-o가 이미지를 어느 경로에 저장하는지 볼 때** → [kubernetes](commands/kubernetes.md#cri-o-이미지-저장소-경로-확인)
- **Pod에서 DNS 조회가 실패하거나 느릴 때** → [kubernetes](commands/kubernetes.md#coredns-로그에서-업스트림-timeout-찾기)
- **CoreDNS가 외부 질의를 어디로 넘기는지 볼 때** → [kubernetes](commands/kubernetes.md#coredns-설정corefile-확인)
- **Pod의 resolv.conf가 어디서 오는지 볼 때** → [kubernetes](commands/kubernetes.md#kubelet의-dns-설정-확인)
- **업스트림 직접 질의와 CoreDNS 경유 질의를 비교할 때** → [kubernetes](commands/kubernetes.md#임시-pod로-dns-경로-비교)
- **외부망이 막힌 클러스터에서 디버그 Pod 이미지를 고를 때** → [kubernetes](commands/kubernetes.md#노드에-이미-있는-이미지-찾기)
- **2/3 Running처럼 일부 컨테이너만 안 뜰 때** → [kubernetes](commands/kubernetes.md#pod-컨테이너별-준비-상태재시작직전-종료-사유-보기)
- **재시작 반복하는 컨테이너가 죽기 전에 뭘 찍었는지 볼 때** → [kubernetes](commands/kubernetes.md#재시작-전-컨테이너-로그-보기)
- **probe 실패·재시작 이벤트를 최근 순으로 볼 때** → [kubernetes](commands/kubernetes.md#네임스페이스-이벤트를-시간순으로-보기)
- **probe 명령과 timeout 설정을 확인할 때** → [kubernetes](commands/kubernetes.md#컨테이너-probe리소스-설정-보기)
- **클러스터에서 문제 있는 Pod만 추릴 때** → [kubernetes](commands/kubernetes.md#running이-아닌-pod만-보기)
- **에러 시작 시점과 Deployment 변경 시점을 맞춰볼 때** → [kubernetes](commands/kubernetes.md#deployment가-언제-재시작변경됐는지-보기)
- **볼륨이 NFS인지 노드 로컬인지 확인할 때** → [kubernetes](commands/kubernetes.md#pvc가-실제로-어디에-저장되는지-보기)

## Loki

- **Loki 로그가 지워지는지, 보존 기간이 얼마인지 볼 때** → [loki](commands/loki.md#로그-보존-기간retention-설정-확인)

## Nginx

- **어느 server 블록·location이 어디로 프록시되는지 볼 때** → [nginx](commands/nginx.md#적용-중인-설정-전체-보기)
- **넣은 접근 제어(allow/deny 등)가 실제로 들어갔는지 볼 때** → [nginx](commands/nginx.md#적용-중인-설정-전체-보기)
- **설정 고친 뒤 반영하기 전에** → [nginx](commands/nginx.md#설정-문법-검사)
- **설정을 연결 끊지 않고 반영할 때** → [nginx](commands/nginx.md#설정-무중단-반영)

## 컨테이너 이미지

- **push가 denied / authentication required로 실패할 때** → [skopeo](commands/skopeo.md#레지스트리-로그인)
- **cri-o 노드에 있는 이미지를 레지스트리로 올릴 때** → [skopeo](commands/skopeo.md#cri-o-노드에-있는-이미지를-레지스트리로-push)

## DNS

- **노드·Pod에서 DNS가 안 될 때 먼저 볼 것** → [dns](commands/dns.md#노드가-실제로-쓰는-dns-서버-확인)
- **resolv.conf의 search에 IP가 들어가 있을 때** → [dns](commands/dns.md#노드가-실제로-쓰는-dns-서버-확인)
- **resolv.conf가 왜 그렇게 생성됐는지 원래 설정을 볼 때** → [dns](commands/dns.md#networkmanager-연결의-dns-설정-확인)
- **resolv.conf가 언제 다시 생성됐는지 볼 때** → [dns](commands/dns.md#resolvconf-변경-이력-보기)
- **패킷이 어느 인터페이스·게이트웨이로 나가는지 볼 때** → [dns](commands/dns.md#특정-목적지로-가는-경로-확인)
- **dig·nslookup이 없는 노드에서 DNS 응답을 확인할 때** → [dns](commands/dns.md#dig-없이-dns-응답률-측정)
- **DNS가 간헐적으로 timeout 날 때 응답률을 잴 때** → [dns](commands/dns.md#dig-없이-dns-응답률-측정)

## Linux 프로세스·커널

- **ps·top·kubectl exec가 멈출 때** → [linux](commands/linux.md#d-state로-멈춘-프로세스-찾기)
- **kill -9로도 안 죽는 프로세스가 있을 때** → [linux](commands/linux.md#d-state로-멈춘-프로세스-찾기)
- **멈춘 프로세스가 무엇을 기다리는지 볼 때** → [linux](commands/linux.md#프로세스가-커널-어디서-멈췄는지-보기)
- **ps 없이 프로세스 시작 시각을 볼 때** → [linux](commands/linux.md#프로세스-시작-시각-확인)
- **Redis·DB가 지연되거나 khugepaged가 멈췄을 때** → [linux](commands/linux.md#thptransparent-huge-page-설정-확인)
- **커널이 남긴 hung task·OOM 경고를 볼 때** → [linux](commands/linux.md#커널-메시지에서-hung-taskoom-찾기)
- **UDP 패킷이 간헐적으로 사라질 때** → [linux](commands/linux.md#conntrack-테이블-사용량-확인)

## SSH

- **인증 한 번으로 여러 번 원격 명령을 실행할 때** → [ssh](commands/ssh.md#제어-소켓으로-접속-재사용-master-연결)
- **제어 소켓으로 원격 명령을 실행할 때** → [ssh](commands/ssh.md#제어-소켓으로-원격-명령-실행)
- **/tmp의 소켓이 어느 서버 것인지 모를 때** → [ssh](commands/ssh.md#떠-있는-제어-소켓과-접속-대상-매핑-확인)

## 파일 검증

- **다운로드한 파일이 공개된 SHA256 값과 같은지 확인할 때** → [checksum](commands/checksum.md#공개된-sha256-값으로-파일-검증)

## Java 인증서

- **Java가 `PKIX path building failed`를 낼 때 루트 CA가 cacerts에 있는지 볼 때** → [java](commands/java.md#truststore에서-ca-이름으로-검색)
- **등록된 인증서의 alias를 모를 때** → [java](commands/java.md#ca-이름으로-alias-찾기)
- **인증서를 넣은 뒤 제대로 들어갔는지 볼 때** → [java](commands/java.md#특정-alias-등록-여부-확인)
- **사설·정부(GPKI) CA를 Java가 신뢰하게 할 때** → [java](commands/java.md#루트-ca-인증서-등록)
- **잘못 넣은 인증서를 빼거나, CA를 뺀 복사본으로 PKIX 에러를 재현할 때** → [java](commands/java.md#인증서-삭제)
- **호스트에 있는 인증서를 컨테이너 안 Java에 등록할 때** → [java](commands/java.md#컨테이너-안-jvm에-호스트-인증서-등록)

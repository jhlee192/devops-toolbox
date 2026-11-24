# Docker

## 컨테이너 로그 설정 확인

```bash
sudo docker inspect <container> --format '{{.HostConfig.LogConfig}}'
```

- **언제**: 컨테이너 로그가 로테이션되고 있는지 볼 때
- **주의**: `{json-file map[]}`처럼 `map[]`이 비어 있으면 로테이션 설정이 없는 것이다. 이 경우 로그가 끝없이 커진다
- **주의**: 데몬 설정(`daemon.json`)이 아니라 **컨테이너에 실제로 적용된 값**을 본다. 컨테이너는 만들어질 때의 설정을 계속 쓰므로 두 값이 다를 수 있다

## 컨테이너 로그 파일 크기 확인

```bash
sudo sh -c 'ls -lh $(docker inspect <container> --format {{.LogPath}})'
```

- **언제**: `docker logs`가 느리거나, `/var/lib/docker`가 커졌거나, dockerd CPU가 높을 때
- **주의**: `.LogPath`는 그 컨테이너의 stdout 로그 파일 경로다. 보통 `/var/lib/docker/containers/<id>/<id>-json.log`
- **주의**: 이 경로는 root만 읽을 수 있다. 그래서 `$(...)` 치환까지 root 권한으로 돌도록 `sudo sh -c '...'`로 감싼다

## 컨테이너 환경변수 확인

```bash
sudo docker inspect <container> --format '{{range .Config.Env}}{{println .}}{{end}}'
```

- **언제**: compose 파일을 찾지 않고, 실행 중인 컨테이너에 실제로 들어간 환경변수를 볼 때 (예: GitLab의 `GITLAB_OMNIBUS_CONFIG`)
- **주의**: `range ... println`은 변수 하나를 한 줄로 출력한다. 여러 줄짜리 값은 그대로 여러 줄로 나온다
- **주의**: 비밀번호나 키가 그대로 출력된다. 공유할 때는 가린다

## daemon.json 문법 검사

```bash
sudo python3 -m json.tool /etc/docker/daemon.json
```

- **언제**: `daemon.json`을 고친 뒤 dockerd를 재시작하기 전에
- **주의**: 문법이 틀린 채로 재시작하면 dockerd가 아예 뜨지 않는다. 그러면 모든 컨테이너가 내려간 상태가 된다
- **주의**: `json.tool`은 JSON을 읽어서 다시 예쁘게 출력한다. 오류가 있으면 줄 번호와 함께 실패한다. 파일은 바뀌지 않는다

## daemon.json 변경 반영 (dockerd 재시작)

```bash
sudo systemctl restart docker
```

- **언제**: `daemon.json`(로그 기본값 등)을 바꾼 뒤
- **주의**: `live-restore`가 꺼져 있으면 **서버의 모든 컨테이너가 같이 재시작된다**
- **주의**: `restart: always`여도 사용자가 직접 `docker stop`한 컨테이너는 자동으로 다시 뜨지 않는다
- **주의**: 로그 기본값(`log-driver`, `log-opts`)은 **이후에 새로 만드는 컨테이너에만** 적용된다. 기존 컨테이너는 아래처럼 다시 만들어야 한다

## compose 컨테이너 재생성

```bash
cd <compose-dir> && sudo docker compose down && sudo docker compose up -d
```

- **언제**: 환경변수나 로그 설정처럼 컨테이너를 만들 때 고정되는 값을 바꾼 뒤
- **주의**: `down`은 컨테이너와 네트워크를 삭제한다. 볼륨에 둔 데이터는 남는다. 컨테이너 stdout 로그 파일은 같이 삭제된다
- **주의**: volumes가 `$VAR/path` 같은 변수 형태면 `sudo`가 환경변수를 넘기지 않아 빈 경로가 될 수 있다. 재생성 전에 `sudo docker compose config`로 실제로 풀린 경로를 확인한다. compose는 같은 디렉터리의 `.env`를 자동으로 읽는다

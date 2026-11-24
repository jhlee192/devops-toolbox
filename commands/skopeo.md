# skopeo (컨테이너 이미지 복사)

## 레지스트리 로그인

```bash
sudo skopeo login <registry> -u <user>
```

- **언제**: 레지스트리에 push하기 전에, 또는 push가 `denied: requested access to the resource is denied` / `unauthorized: authentication required`로 실패할 때
- **주의**: `<registry>`는 포트까지 포함한 주소다 (예: `registry.example.com:5000`). 비밀번호를 물으면 레지스트리 쓰기 권한이 있는 토큰을 넣는다. GitLab이면 `write_registry` 권한이 있는 Personal Access Token이나 Deploy Token이다
- **주의**: 로그인 정보는 실행한 사용자별로 저장된다. push를 `sudo`로 할 거면 로그인도 `sudo`로 해야 한다. root는 `/run/containers/0/auth.json`에 저장되며, `/run`은 재부팅하면 지워진다
- **주의**: 로그인했는데도 `denied`만 나오면 계정 권한 문제다. GitLab은 그 프로젝트에 Developer 이상이어야 push할 수 있다

## cri-o 노드에 있는 이미지를 레지스트리로 push

```bash
sudo skopeo copy "containers-storage:[<driver>@<root>+<runroot>]<image>:<tag>" docker://<registry>/<image>:<tag>
```

- **언제**: cri-o(또는 podman) 노드에 받아져 있는 이미지를 레지스트리로 올릴 때. `crictl`에는 push 기능이 없다
- **주의**: `containers-storage:`는 cri-o·podman이 쓰는 로컬 이미지 저장소에서 읽고, `docker://`는 레지스트리에 쓴다. 이미지 이름에 레지스트리 주소가 들어 있으면 앞뒤 이름이 같아도 된다
- **주의**: `[<driver>@<root>+<runroot>]`는 저장소 위치 지정이다. cri-o가 기본 경로(`/var/lib/containers/storage`)를 쓰면 대괄호 부분을 통째로 빼도 된다. 다른 경로를 쓰면 넣어야 하고, 안 넣으면 이미지를 못 찾는다. 대괄호를 쉘이 해석하지 않도록 따옴표로 감싼다
- **주의**: 저장소가 root 소유라 `sudo`가 필요하다. cri-o가 실행 중이어도 읽기는 괜찮다
- **주의**: `ERRO Failed to parse the authentication scope`는 다른 저장소에서 레이어를 가져다 쓰려다(cross-repo mount) 나오는 메시지로, 이후 작업은 계속 진행된다
- **주의**: 저장소에는 레이어가 압축 풀린 상태로 있어서 push할 때 다시 압축한다. 같은 이미지라도 manifest digest가 바뀔 수 있다
- **연관**: `<driver>`, `<root>`, `<runroot>` 값은 [kubernetes](kubernetes.md#cri-o-이미지-저장소-경로-확인)에서 확인한다

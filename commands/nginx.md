# Nginx

## 적용 중인 설정 전체 보기

```bash
sudo nginx -T -c <nginx-conf> 2>/dev/null | grep -nE 'listen|server_name|location|limit_except|allow|deny|proxy_pass'
```

- **언제**: 어느 포트·도메인의 server 블록에 어떤 location이 있고 어디로 프록시되는지, 넣은 접근 제어가 실제로 들어갔는지 볼 때
- **주의**: 대문자 `-T`는 문법 검사 후 **include된 파일까지 합친 전체 설정을 출력**한다. 소문자 `-t`는 검사 결과만 보여 준다
- **주의**: `-c`는 메인 설정 파일을 지정한다. 빼면 빌드 때 정해진 기본 경로를 읽는데, 그 파일이 실제로 쓰이는 설정이 아닐 수 있다
- **주의**: `2>/dev/null`은 검사 결과 메시지(stderr)를 숨기고 설정 내용만 grep으로 넘긴다. `-n`은 줄 번호를 붙인다
- **연관**: GitLab 번들 Nginx는 바이너리와 설정 경로가 다르다. [gitlab](gitlab.md#번들-nginx-설정-문법-검사) 참고

## 설정 문법 검사

```bash
sudo nginx -t -c <nginx-conf>
```

- **언제**: 설정을 고친 뒤 반영하기 전에 항상
- **주의**: 출력 첫 줄에 나온 경로가 **실제로 쓰는 설정 파일인지** 확인한다. `-c` 없이 실행하면 쓰이지 않는 기본 파일을 검사하고도 `syntax is ok`가 나올 수 있다
- **주의**: include한 파일을 못 읽으면 `open() "<경로>" failed (2: No such file or directory)` 또는 `(13: Permission denied)`가 나온다. SELinux가 켜진 서버에서는 경로가 맞아도 13이 나올 수 있다

## 설정 무중단 반영

```bash
sudo nginx -s reload
```

- **언제**: 설정을 바꾸고 연결을 끊지 않고 반영할 때
- **주의**: `-s reload`는 마스터 프로세스에 설정을 다시 읽으라는 신호를 보낸다. 기존 연결은 마무리될 때까지 유지되고 새 요청부터 새 설정이 적용된다. 재기동(restart)은 진행 중인 연결이 끊긴다
- **주의**: systemd로 관리한다면 `sudo systemctl reload nginx`도 같은 동작이다
- **연관**: 먼저 "설정 문법 검사"를 통과시킨다

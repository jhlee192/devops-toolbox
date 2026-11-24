# Java 인증서 (keytool)

## truststore에서 CA 이름으로 검색

```bash
keytool -list -v -cacerts -storepass changeit | grep -i 'Owner:' | grep -i '<ca-name>'
```

- **언제**: Java가 HTTPS 호출에서 `PKIX path building failed`를 낼 때, 그 서버 인증서의 루트 CA가 JVM의 신뢰 저장소(cacerts)에 들어 있는지 볼 때
- **주의**: cacerts에는 서버 인증서가 아니라 **루트 CA**가 들어 있다. 루트 CA만 있으면 그 CA가 발급한 서버 인증서는 따로 등록하지 않아도 통과한다. 루트 CA 이름은 `openssl s_client ... -showcerts` 출력의 마지막 `i:`(발급자)에서 확인한다
- **주의**: `-cacerts`는 **실행한 그 JDK의** 기본 cacerts를 가리킨다(Java 9 이상). Java 8은 `-keystore $JAVA_HOME/jre/lib/security/cacerts`로 지정한다. 앱이 쓰는 JDK와 다른 `keytool`로 보면 엉뚱한 파일을 보게 된다
- **주의**: `-v`(상세 출력)를 붙여야 `Owner:`(인증서 주인, subject) 줄이 나온다. `changeit`은 cacerts의 기본 비밀번호다
- **주의**: 앱이 `-Djavax.net.ssl.trustStore=<path>`로 별도 파일을 쓰고 있으면 기본 cacerts는 무시된다. `ps -ef | grep java`로 이 옵션이 붙어 있는지 먼저 본다
- **연관**: 없으면 아래 "루트 CA 인증서 등록"

## CA 이름으로 alias 찾기

```bash
keytool -list -v -keystore <keystore> -storepass changeit | grep -iE 'Alias name|Owner:' | grep -iB1 '<ca-name>'
```

- **언제**: 등록된 인증서를 지우거나 확인하려는데 저장소 안에서 부르는 이름(alias)을 모를 때
- **주의**: `grep -B1`은 걸린 줄 바로 위 1줄도 같이 보여준다. 출력에서 `Alias name`이 `Owner` 바로 위에 오므로 alias가 함께 나온다
- **연관**: 찾은 alias로 "특정 alias 등록 여부 확인", "인증서 삭제"

## 특정 alias 등록 여부 확인

```bash
keytool -list -cacerts -storepass changeit -alias <alias>
```

- **언제**: 인증서를 등록한 뒤 제대로 들어갔는지 볼 때
- **주의**: 없으면 `Alias <alias> does not exist` 에러로 끝난다

## 루트 CA 인증서 등록

```bash
keytool -importcert -cacerts -storepass changeit -alias <alias> -file <cert-file> -noprompt
```

- **언제**: 사설 CA나 JDK 기본 cacerts에 없는 CA(정부 GPKI 등)가 발급한 인증서를 Java가 신뢰하게 만들 때
- **주의**: 옵션 — `-importcert` 인증서 추가 / `-alias` 저장소 안에서 부를 이름(기존 것과 겹치면 실패) / `-file` 등록할 인증서(PEM, DER 둘 다 됨) / `-noprompt` "신뢰하시겠습니까?" 확인 생략
- **주의**: 보통 **루트 CA만** 넣는다. 중간 인증서는 서버가 보내는 게 정상이다. 서버가 중간 인증서를 안 보내면 루트를 넣어도 PKIX 에러가 계속 난다. 이때는 서버에 fullchain을 등록하는 게 근본 해결이고, 서버를 못 고칠 때만 중간 CA도 같이 넣는다
- **주의**: 서버 인증서 자체를 넣는 건 피한다. 인증서를 갱신할 때마다 다시 넣어야 하고, 놓치면 그날부터 PKIX 에러가 난다. 자체 서명 인증서는 자기가 곧 루트라서 예외다
- **주의**: 루트 인증서는 CA 공식 배포처에서 받는다. 접속 대상 서버가 보내준 것을 그대로 쓰면 신뢰의 출발점을 상대에게서 받는 셈이다
- **주의**: 등록한 뒤 **Java 프로세스를 재시작해야** 반영된다. truststore는 JVM이 뜰 때 읽는다
- **주의**: JDK를 업그레이드하거나 재설치하면 cacerts가 새 파일로 바뀌어 등록한 CA가 사라진다. 배포 스크립트나 Dockerfile에 등록 단계를 넣어 둔다
- **연관**: "특정 alias 등록 여부 확인"

## 인증서 삭제

```bash
keytool -delete -alias <alias> -keystore <keystore> -storepass changeit
```

- **언제**: 잘못 넣은 인증서를 뺄 때. 또는 cacerts **복사본**에서 특정 CA를 빼고 `-Djavax.net.ssl.trustStore=<복사본>`으로 실행해 "이 CA가 없으면 PKIX 에러가 나는지" 재현할 때
- **주의**: 원본 cacerts에서 공인 루트 CA를 지우면 그 CA를 쓰는 외부 호출이 전부 PKIX로 실패한다. 재현할 때는 `cp`로 복사본을 만들어 거기서 지운다

## 컨테이너 안 JVM에 호스트 인증서 등록

```bash
docker exec -i <container> keytool -importcert -cacerts -storepass changeit -alias <alias> -noprompt < <cert-file>
```

- **언제**: 인증서 파일은 호스트에 있는데 컨테이너 안의 Java에 등록할 때
- **주의**: `docker exec`로 실행한 명령은 컨테이너 안에서 돈다. 그래서 `-file <cert-file>`로 주면 호스트 파일을 못 찾는다. `-file`을 빼면 keytool이 표준입력에서 인증서를 읽으므로, 호스트 쉘의 `<` 리다이렉트로 내용을 넘긴다
- **주의**: `-it`가 아니라 `-i`만 쓴다. `-i`는 표준입력을 컨테이너로 연결하고, `-t`는 터미널을 붙인다. 입력을 파일로 넘기면서 `-t`를 붙이면 `the input device is not a TTY`로 실패한다
- **주의**: `docker restart`로는 유지되지만, 컨테이너를 지우고 다시 만들면(`docker rm`, compose 재생성, 이미지 업데이트) 사라진다. 계속 쓸 거면 Dockerfile에 `COPY` + `RUN keytool -importcert ...`로 넣는다
- **연관**: 파일을 먼저 넣고 싶으면 `docker cp <cert-file> <container>:/tmp/` 후 `-file /tmp/<cert-file>`로 등록. 등록 뒤 `docker restart <container>`

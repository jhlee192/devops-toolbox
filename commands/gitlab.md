# GitLab (Omnibus / Docker)

## 서비스 구성요소 상태 확인

```bash
sudo docker exec <container> gitlab-ctl status
```

- **언제**: GitLab 안의 puma, sidekiq, gitaly, postgresql 같은 구성요소가 모두 떠 있는지, 언제 재시작됐는지 볼 때
- **주의**: 줄마다 `run: <서비스>: (pid N) <초>s` 형태로 나온다. 끝의 숫자는 그 서비스가 떠 있은 시간(초)이다. 한 서비스만 유독 작으면 최근에 죽었다가 다시 뜬 것이다
- **주의**: Docker가 아니라 서버에 직접 설치했다면 `sudo docker exec <container>`를 빼고 `sudo gitlab-ctl status`로 실행한다. 이 파일의 다른 명령도 같다

## 실제 적용된 설정 값 보기

```bash
sudo docker exec <container> gitlab-ctl show-config 2>/dev/null | grep -A3 -E '"(<key>)"'
```

- **언제**: `gitlab.rb`와 `GITLAB_OMNIBUS_CONFIG` 환경변수를 합쳐서 최종적으로 어떤 값이 적용됐는지 볼 때
- **주의**: 설정 도구(Chef)를 실제로 적용하지 않고 계산만 해서 JSON으로 출력한다. 출력 끝의 `Converging 0 resources`는 아무것도 바꾸지 않았다는 뜻이다. 실행에 10초 정도 걸린다
- **주의**: 사용자가 지정한 값과 일부 계산된 값만 나온다. 기본값은 대부분 빠지므로, 출력에 없다고 해서 꺼져 있다는 뜻은 아니다
- **주의**: 출력에 비밀번호나 시크릿이 섞일 수 있다. 통째로 공유하지 않는다
- **주의**: 출력 앞뒤에 JSON이 아닌 로그 줄이 붙는다. 그대로 JSON 파서에 넣으면 `Extra data` 에러가 난다
- **연관**: Rails가 실행될 때 채우는 기본값은 여기서 안 보인다. 아래 "Rails 설정 값 직접 조회"로 확인한다

## show-config에 안 보이는 기본값 추적

```bash
sudo docker exec <container> grep -n "<key>" /opt/gitlab/embedded/cookbooks/gitlab/attributes/default.rb
sudo docker exec <container> grep -n "<key>" /var/opt/gitlab/gitlab-rails/etc/gitlab.yml
sudo docker exec <container> grep -n "<key>" /opt/gitlab/embedded/service/gitlab-rails/config/initializers/1_settings.rb
```

- **언제**: 설정하지 않은 값이 실제로 어떻게 정해지는지 단계별로 따라갈 때
- **주의**: 첫 줄은 Omnibus 기본값, 둘째 줄은 reconfigure가 만든 Rails 설정 파일, 셋째 줄은 Rails 초기화 코드다. 앞 단계에서 값이 비어 있으면 뒤 단계에서 채워지는 경우가 있다 (예: `email_enabled`는 비어 있으면 Rails가 true로 채운다)
- **주의**: `default.rb`의 키 이름과 `gitlab.yml`의 키 이름이 다를 수 있다 (예: `gitlab_email_enabled` → `email_enabled`). 짧은 이름으로 검색하는 게 낫다

## Rails 설정 값 직접 조회

```bash
sudo docker exec <container> gitlab-rails runner 'puts Gitlab.config.gitlab.email_enabled; puts ActionMailer::Base.delivery_method'
```

- **언제**: 메일이 실제로 켜져 있는지, 어떤 방식(smtp/sendmail)으로 나가는지처럼 최종 적용 값을 확인할 때
- **주의**: `gitlab-rails runner '<루비 코드>'`는 GitLab 애플리케이션을 불러온 뒤 코드를 실행하고 끝난다. 콘솔을 열지 않고 값만 볼 때 쓴다. 로딩 때문에 30초 정도 걸린다
- **주의**: `smtp_enable`은 **어떻게** 보낼지, `gitlab_email_enabled`는 **보낼지 말지**를 정한다. 메일을 끄려면 `gitlab_email_enabled = false`다. `smtp_enable = false`는 기본값이라 넣어도 바뀌는 게 없다
- **연관**: SMTP를 켜지 않으면 발송 방식이 `sendmail`이 된다. 공식 Docker 이미지에는 sendmail이 없어서 메일 잡이 `Errno::ENOENT`로 실패한다

## Sidekiq 사용률과 큐 대기 시간 확인

```bash
sudo docker exec <container> gitlab-rails runner 'require "sidekiq/api"; Sidekiq::ProcessSet.new.each { |p| puts "concurrency=#{p["concurrency"]} busy=#{p["busy"]}" }; Sidekiq::Queue.all.each { |q| puts "#{q.name} size=#{q.size} latency=#{q.latency.round}s" }'
```

- **언제**: 머지나 파이프라인 진행이 느릴 때, Sidekiq가 밀려 있는지 볼 때
- **주의**: `busy`가 `concurrency`와 같으면 그 순간 스레드가 모두 사용 중이다. 순간적으로 차는 것은 흔하다. 판단은 `latency`(큐에서 가장 오래 기다린 잡의 대기 시간)로 한다. 이 값이 금방 0으로 돌아오면 순간적인 몰림이다
- **주의**: 머지(`MergeWorker`)나 파이프라인 진행(`PipelineProcessWorker`) 잡도 같은 `default` 큐를 쓴다. latency가 곧 머지 대기 시간이다
- **연관**: 웹 UI에서는 Admin → Monitoring → Background jobs의 Busy 탭과 Queues 탭에서 같은 값을 볼 수 있다

## Sidekiq에서 지금 실행 중인 잡 보기

```bash
sudo docker exec <container> gitlab-rails runner 'require "sidekiq/api"; Sidekiq::Workers.new.each { |_, _, w| pl = w["payload"]; pl = Sidekiq.load_json(pl) if pl.is_a?(String); puts "#{(Time.now.to_i - w["run_at"]).to_i}s #{pl["class"]} q=#{w["queue"]}" }'
```

- **언제**: 스레드를 무엇이 차지하고 있는지, 몇 분째 안 끝나는 잡이 있는지 볼 때
- **주의**: 맨 앞 숫자는 그 잡이 실행된 지 몇 초인지다. 오래 걸리는 잡 몇 개가 원인인지, 짧은 잡이 계속 몰리는 처리량 문제인지 여기서 갈린다
- **주의**: 버전에 따라 `payload`가 문자열(JSON)로 들어 있어서 `load_json`으로 풀어야 한다

## 큐에 쌓인 잡 종류 집계

```bash
sudo docker exec <container> gitlab-rails runner 'require "sidekiq/api"; Sidekiq::Queue.new("<queue>").map(&:klass).tally.sort_by { -_2 }.first(10).each { |k, v| puts "#{v} #{k}" }'
```

- **언제**: 큐가 밀려 있을 때, 어떤 잡이 많이 쌓였는지 볼 때
- **주의**: `<queue>`는 보통 `default`다. 최근 GitLab은 대부분의 잡을 `default` 큐 하나로 보낸다
- **주의**: 큐가 수만 건이면 전부 읽느라 오래 걸린다

## 실패 잡(Dead / Retry) 원인 집계

```bash
sudo docker exec <container> gitlab-rails runner 'require "sidekiq/api"; Sidekiq::DeadSet.new.first(2000).map { |j| [j.klass, j["error_class"]] }.tally.sort_by { -_2 }.first(8).each { |k, v| puts "#{v} #{k.inspect}" }'
```

- **언제**: Dead 목록이 쌓였을 때 어떤 잡이 어떤 에러로 죽는지 한눈에 볼 때
- **주의**: Dead 목록은 기본 상한이 약 1만 건이다. 상한까지 차면 오래된 것부터 밀려나고, 새 실패가 묻혀서 안 보인다. 원인을 고친 뒤 웹 UI(Background jobs → Dead → Delete All)에서 비워 두는 게 좋다
- **주의**: 메일 잡은 클래스명이 `ActiveJob::...::JobWrapper`로 나온다. 실제 클래스는 잡 인자 안에 있다
- **연관**: 재시도 대기 중인 잡은 `DeadSet` 대신 `RetrySet`으로 같은 방식으로 본다

## 머지 진행 중(locked)으로 멈춘 MR 찾기

```bash
sudo docker exec <container> gitlab-rails runner 'MergeRequest.where(state_id: MergeRequest.available_states[:locked]).each { |m| puts "#{m.project.full_path}!#{m.iid} jid=#{m.merge_jid} running=#{Gitlab::SidekiqStatus.running?(m.merge_jid)} updated=#{m.updated_at}" }'
```

- **언제**: MR이 "Merging! Drum roll" 화면에서 넘어가지 않을 때
- **주의**: `running=true`면 머지 잡이 아직 처리 중이거나 큐에서 기다리는 중이다. `running=false`인데 locked로 남아 있으면 잡이 유실된 것이다(예: 머지 도중 Sidekiq 재시작)
- **주의**: `merge_jid`는 그 MR의 머지를 맡은 Sidekiq 잡 ID다

## Sidekiq 로그에서 특정 문자열 찾기

```bash
sudo docker exec <container> sh -c "grep -h '<pattern>' /var/log/gitlab/sidekiq/current | tail -20"
```

- **언제**: 특정 워커(`MergeWorker` 등)나 에러(`Errno::ENOENT` 등)가 언제, 얼마나 걸렸는지 볼 때
- **주의**: 한 줄이 JSON 하나다. 볼 필드는 `job_status`(start/done/fail), `duration_s`(실행 시간), `queue_duration_s`(큐에서 기다린 시간), `gitaly_duration_s`(그중 Gitaly에서 쓴 시간)
- **주의**: `start`만 있고 `done`이나 `fail`이 없으면 아직 실행 중이거나 잡이 유실된 것이다
- **주의**: 로테이트된 이전 로그(`@*.s`)는 gzip이라 `zcat`으로 읽는다

## 내장 PostgreSQL 커넥션 사용량

```bash
echo "select count(*) || ' / ' || current_setting('max_connections') from pg_stat_activity;" | sudo docker exec -i <container> gitlab-psql -At
```

- **언제**: Sidekiq 스레드나 puma 워커를 늘리기 전에 DB 커넥션 여유를 확인할 때
- **주의**: `gitlab-psql`은 내장 PostgreSQL에 gitlab 계정으로 붙는 래퍼다. `-A`는 표 테두리 없이, `-t`는 헤더 없이 값만 출력한다
- **주의**: SQL을 `-c "..."`로 넘기면 원격 SSH나 `sh -c`를 거치며 따옴표가 깨지기 쉽다. 표준입력으로 넘기면 이 문제가 없다. 이때 `docker exec`에 `-i`가 있어야 표준입력이 컨테이너로 전달된다
- **연관**: 어느 프로세스가 커넥션을 쓰는지는 `select application_name, count(*) from pg_stat_activity group by 1 order by 2 desc;`로 본다

## Rails 콘솔 열기

```bash
sudo docker exec -it <container> gitlab-rails console
```

- **언제**: 유저 상태 조회나 잠금 해제처럼 Ruby 코드를 여러 줄 이어서 실행할 때
- **주의**: GitLab 애플리케이션 안에서 도는 Ruby 콘솔이다. DB에 바로 반영되므로 조회만 할 때도 실수로 값을 바꾸지 않게 조심한다. 뜨는 데 수십 초 걸린다
- **주의**: `-it`가 없으면 입력을 받지 못하고 바로 끝난다. `-i`는 표준입력 연결, `-t`는 터미널 할당이다
- **주의**: 콘솔에서 설정 값을 대입해도(예: `User.maximum_attempts = 5`) 그 콘솔 프로세스에서만 바뀐다. 웹 요청을 처리하는 Puma에는 반영되지 않는다
- **연관**: 한 줄로 끝나는 조회는 `gitlab-rails runner '<루비 코드>'`가 편하다

## 계정 잠금 상태와 실패 횟수 확인

```bash
sudo docker exec <container> gitlab-rails runner 'u = User.find_by_username("<user>"); puts "locked=#{u.access_locked?} failed=#{u.failed_attempts}"'
```

- **언제**: 로그인할 때 "Your account is locked."가 뜰 때
- **주의**: `access_locked?`는 지금 잠겨 있는지, `failed_attempts`는 누적된 로그인 실패 횟수다
- **주의**: 실패 횟수는 잠긴 뒤에도 계속 올라간다. 잠긴 상태에서는 맞는 비밀번호도 실패로 센다. 0으로 돌아가는 건 로그인 성공, 잠금 해제, 잠금 시간이 지난 뒤 다음 시도가 들어왔을 때다
- **연관**: 잠금을 풀면 실패 횟수가 0이 된다. 조사가 필요하면 풀기 전에 이 값을 먼저 기록한다

## 계정 잠금 해제

```bash
sudo docker exec <container> gitlab-rails runner 'User.find_by_username("<user>").unlock_access!'
```

- **언제**: 잠금 시간이 지나기를 기다릴 수 없을 때, 특히 root처럼 웹에서 풀어 줄 다른 관리자가 없을 때
- **주의**: 잠금을 풀면서 실패 횟수도 0으로 초기화한다. 비밀번호는 바꾸지 않는다
- **연관**: 다른 관리자 계정이 있으면 웹 UI의 Admin → Users → 해당 유저 → Unlock으로도 풀 수 있다

## 계정 잠금 기준 확인

```bash
sudo docker exec <container> gitlab-rails runner 'puts User.maximum_attempts; puts User.unlock_in'
```

- **언제**: 몇 번 틀리면 잠기는지, 잠긴 뒤 언제 저절로 풀리는지 볼 때
- **주의**: GitLab이 쓰는 인증 라이브러리(Devise)의 설정값이다. 따로 바꾸지 않았다면 `10`과 `10 minutes`가 나온다
- **주의**: `gitlab.rb`에는 이 값을 바꾸는 항목이 없다

## 인증 이벤트 테이블에서 로그인 실패 IP 조회

```bash
sudo docker exec <container> gitlab-rails runner 'AuthenticationEvent.where(user_name: "<user>", result: :failed).order(created_at: :desc).limit(40).pluck(:created_at, :ip_address, :provider).each { |r| puts r.join(" ") }'
```

- **언제**: 어떤 계정의 로그인 실패가 언제, 어느 IP에서 났는지 볼 때
- **주의**: `result: :failed`는 실패만 고르고, `pluck`은 시각, IP, 인증 방식 컬럼만 뽑는다. `provider`가 `standard`면 일반 ID/비밀번호 로그인이다
- **주의**: 버전이나 환경에 따라 실패가 있었는데도 결과가 비어 있을 수 있다. 그럴 때는 아래 "로그에서 로그인 실패 IP 찾기"로 본다
- **연관**: IP별 건수만 보려면 `pluck(...)` 부분을 `group(:ip_address).count`로 바꾼다

## 로그에서 로그인 실패 IP 찾기

```bash
sudo docker exec <container> grep -h 'Failed Login: username=<user>' /var/log/gitlab/gitlab-rails/application_json.log
```

- **언제**: 계정이 잠겼거나 로그인 실패가 의심될 때, 누가(어느 IP가) 시도했는지 찾을 때
- **주의**: 실패 한 건이 JSON 한 줄이고, `message`에 `ip=`가 함께 찍힌다
- **주의**: `time`은 UTC다. 한국 시간은 9시간을 더한다
- **주의**: 현재 파일만 검색한다. 로테이션된 이전 로그는 `.gz`로 압축되어 있어서 `grep` 대신 `zgrep`을 써야 한다

## 번들 Nginx 설정 문법 검사

```bash
sudo docker exec <container> /opt/gitlab/embedded/sbin/nginx -t -c /var/opt/gitlab/nginx/conf/nginx.conf
```

- **언제**: GitLab에 포함된 Nginx 설정 파일을 직접 고친 뒤 반영하기 전에
- **주의**: `-c`를 빼면 `/opt/gitlab/embedded/conf/nginx.conf`를 검사하고 `syntax is ok`가 나온다. 이 파일은 패키지 기본 설정이라 실제로는 쓰이지 않는다. 출력에 `/var/opt/gitlab/nginx/conf/nginx.conf`가 나와야 제대로 검사한 것이다
- **주의**: 소문자 `-t` 대신 대문자 `-T`를 쓰면 include된 파일까지 합친 전체 설정이 출력된다. 레지스트리용 server 블록은 `gitlab-registry.conf`, 웹·git(HTTPS)은 `gitlab-http.conf`에 있다
- **연관**: 일반 Nginx 기준은 [nginx](nginx.md#설정-문법-검사)

## 번들 Nginx 설정 무중단 반영

```bash
sudo docker exec <container> gitlab-ctl hup nginx
```

- **언제**: 번들 Nginx 설정을 고치고 연결을 끊지 않고 반영할 때
- **주의**: `hup`은 Nginx에 HUP 신호를 보내 설정만 다시 읽게 한다. `nginx -s reload`와 같다. `gitlab-ctl restart nginx`는 진행 중인 연결이 끊긴다
- **주의**: `/var/opt/gitlab/nginx/conf/` 아래 파일을 직접 고쳤다면 `gitlab-ctl reconfigure`는 실행하지 않는다. reconfigure가 파일을 다시 만들면서 고친 내용이 사라진다

## 직접 고친 번들 Nginx 설정이 남아 있는지 확인

```bash
sudo docker exec <container> grep -c '<directive>' /var/opt/gitlab/nginx/conf/<conf-file>
```

- **언제**: `gitlab-ctl reconfigure`나 GitLab 업그레이드 뒤, 직접 넣은 Nginx 설정이 살아 있는지 볼 때
- **주의**: `-c`는 일치하는 줄 수를 센다. `0`이면 설정이 사라진 것이므로 다시 넣는다
- **주의**: `/var/opt/gitlab/nginx/conf/` 아래 파일은 reconfigure·업그레이드 때 다시 생성된다. 영구적으로 넣으려면 `gitlab.rb`의 `registry_nginx['custom_gitlab_server_config']` 같은 설정을 쓴다

## 버전별 변경 내역(CHANGELOG) 검색

```bash
curl -sfL "https://gitlab.com/gitlab-org/gitlab/-/raw/<major>-<minor>-stable-ee/CHANGELOG.md" -o CHANGELOG.md
grep -n "^## <major>.<minor>" CHANGELOG.md
grep -niE "<keyword>" CHANGELOG.md
```

- **언제**: 업그레이드 뒤 동작이 바뀐 것 같을 때, 어느 버전에서 어떤 수정이 들어갔는지 찾을 때
- **주의**: `<major>-<minor>-stable-ee` 브랜치(예: `18-11-stable-ee`)의 CHANGELOG에는 그 마이너 버전의 모든 패치(.1, .2 …)와 이전 버전 내역이 한 파일에 들어 있다. `-f`는 404 같은 HTTP 에러면 빈 파일 대신 실패로 끝나게 하고, `-L`은 리다이렉트를 따라간다
- **주의**: 키워드에 걸린 줄이 어느 버전 소속인지는 그 줄 위쪽의 가장 가까운 `## x.y.z` 헤더로 판단한다. 아래 awk로 바로 확인할 수 있다
  ```bash
  awk '/^## /{h=$0} NR==<line>{print h}' CHANGELOG.md
  ```
- **주의**: 패치 릴리스는 대부분 보안·버그 수정이고 `No changes.`인 버전도 많다. 기본값 변경 같은 동작 변화는 보통 마이너 버전(.0)에 들어간다

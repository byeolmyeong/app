---
type: plan
status: proposed
tags: [배포, TestFlight, EAS, 테스트앱, 운영앱]
last_reviewed: 2026-11-19
---
# 테스트앱(TestFlight 전용)과 운영앱을 나눠 올린다

> 상태: 제안 · 기준 2026-11-19 · 브랜치 `feat/testflight-test-app`(origin/develop `03a8bb3` 위) · 작업 폴더 `../.wt-app-testflight`
> 이 세션은 문서만 썼다(소유자 "문서만 적어놔 작업은 새세션에서 할거야"). 실행하는 세션은 소유자 승인("승인"·"가자")을 받고 `status: approved` 로 바꾼 뒤 태스크 1부터 한다.

## 목표
- 무엇을: 같은 코드에서 iOS 앱을 둘 만든다. **테스트앱** "별명 테스트"(`com.byeolmyeong.app.test`)는 스테이징 서버를 보고 TestFlight 에만 올린다. **운영앱** "별명"(`com.byeolmyeong.app`)은 운영 서버를 보고 TestFlight 를 거쳐 App Store 로 간다.
- 누구를 위해: 소유자 · 팀 · 테스터가 스테이징을 폰에서 확인하고, 운영앱과 한 폰에 같이 깔아 둘 수 있게.
- 끝나면: `npx eas-cli@latest build --profile test --platform ios --auto-submit` 한 줄로 테스트앱이 TestFlight 에 올라간다. 운영앱은 같은 명령의 `--profile production`(운영 서버가 뜬 뒤).

## 결정된 전제
- 운영 번들 ID `com.byeolmyeong.app` 의 Apple Developer · App Store Connect 준비는 소유자가 끝냈다(2026-11-19 "운영 번들 ID랑은 다 했어").
- 서버 · 웹 주소와 브랜치 → 환경: docs/decisions/037-web-deploy-vercel.md (스테이징 `api-staging.` · `app.staging.`, 운영 `api.` · `app.`).
- 소셜 로그인의 플랫폼별 방법, 앱의 공급자 값은 `.env` 의 `EXPO_PUBLIC_*` → `app.config.ts`: docs/decisions/034-social-login-platforms.md
- 스토어 심사 제출은 1.0.0 계획 범위 밖(docs/plans/2026-11-10-app-1.0.0.md 태스크 11). 이 계획도 App Store 심사 요청은 하지 않는다.
- 서버는 토큰의 aud 를 환경 변수로 받는다. 애플은 목록(`APPLE_CLIENT_IDS`), 카카오는 `KAKAO_REST_API_KEY` + `KAKAO_NATIVE_APP_KEY`(서버 `src/main/resources/application.properties` 55 · 57행). **서버 코드는 고치지 않고 스테이징 서버의 환경 변수만 바꾼다.**
- 2026-11-19 확인한 지금 상태: `eas.json` 에는 `development` · `development-simulator` 만 있다. EAS 프로젝트가 연결되어 있지 않다(`eas project:info` 실패, `app.json` 에 `extra.eas.projectId` 없음). EAS 로그인 계정은 `monkeygarden`(`monkeygardens-team` 의 Owner). 스테이징 서버는 응답한다(401). 운영 서버(`api.byeolmyeong.com`)는 같은 날 저녁 첫 배포를 마쳐 `/health` 가 200 이다. 다만 이메일 필수 · 닉네임은 아직 들어가지 않았다(태스크 8).

## 인터뷰 결과 (2026-11-19 소유자)
| 질문 | 답 | 영향 |
|---|---|---|
| 테스트앱 번들 ID | `com.byeolmyeong.app.test` | 앱 쪽 이름을 모두 `test` 로 맞춘다(EAS 프로필 `test`, `APP_VARIANT=test`). 서버 · 웹 쪽 이름은 그대로 "스테이징" |
| EAS 프로젝트 계정 | `monkeygardens-team` | `eas init --account monkeygardens-team` |
| 카카오 로그인 | 테스트용 카카오 앱을 따로 만든다 | 스테이징 서버 · 스테이징 웹의 카카오 키를 모두 테스트 카카오 앱 값으로 바꾼다. 운영 카카오 앱은 운영 전용이 된다 |
| 운영앱 첫 업로드 | 설정만 지금, 업로드는 운영 서버가 뜬 뒤 | 태스크 8 은 차단으로 남는다 |

## 내 결정 (묻지 않고 고른 기본값)
- 홈 화면 이름 "별명 테스트", App Store Connect 앱 이름도 "별명 테스트"(이미 쓰는 이름이면 소유자가 고른다). 아이콘은 운영과 같다. 틀리면 비용: 이름은 다음 빌드부터 바뀐다.
- 어떤 앱으로 빌드할지는 환경 변수 `APP_VARIANT` 로 고른다(Expo "app variants" 관례). eas.json 의 `test` 프로필에만 `APP_VARIANT=test`. 값이 없으면 지금과 같은 운영 설정이라 웹(Vercel) · 개발 빌드는 바뀌지 않는다. 모르는 값이면 `app.config.ts` 가 에러를 낸다. 오타 하나로 스테이징을 보는 빌드가 운영 번들 ID 로 올라가지 않게 하려는 것이다.
- 테스트 변형이 바꾸는 것은 넷이다: `ios.bundleIdentifier` · `android.package`(둘 다 `com.byeolmyeong.app.test`), `name`, `scheme`(`byeolmyeong-test`). 안드로이드 테스트 빌드는 하지 않지만, 실수로 만들어도 운영 패키지로 플레이에 올라가지 않게 패키지도 바꾼다. scheme 을 바꾸는 이유: 두 앱을 같이 깔면 같은 scheme 이 겹친다.
- 개발 빌드 프로필(`development` · `development-simulator`)은 그대로 운영 번들 ID 를 쓴다. 이유: 소셜 로그인 계획(docs/plans/2026-11-18-social-login.md) A8 의 기기 확인이 운영 ID 기준 콘솔 설정에 맞춰져 있다. 틀리면 비용: 개발 빌드와 운영앱이 한 폰에서 서로를 덮어쓴다. 그때 개발 변형을 따로 만든다.
- EAS 환경은 `test` 프로필 → `preview`, `production` 프로필 → `production` 으로 잇는다. EAS 가 기본으로 주는 환경 이름을 그대로 쓴다.
- 서버 · 웹 주소 두 값(`EXPO_PUBLIC_API_URL` · `EXPO_PUBLIC_WEB_URL`)은 결정 037 에 공개된 값이라 실행 세션이 EAS 환경 변수로 만든다. 구글 · 카카오 공급자 값은 `.env` 규칙대로 문서 · 대화 · 커밋에 적지 않고, 소유자가 EAS 환경 변수에 직접 넣는다.
- 빌드 번호: `cli.appVersionSource: "remote"` + 두 스토어 프로필에 `autoIncrement: true`. 버전(1.0.0)은 `app.json` 그대로 둔다.
- 수출 규정: `app.json` 에 `ios.config.usesNonExemptEncryption: false` 를 둔다. 앱은 HTTPS 만 쓰므로, TestFlight 에 올릴 때마다 묻는 질문을 없앤다. 틀리면 비용: 자체 암호화 기능을 넣을 때 바꾼다.
- submit 프로필에 `ascAppId` 는 지금 넣지 않는다. 소유자가 대화형으로 올리면 EAS 가 번들 ID 로 앱을 찾고, 없으면 만들지 묻는다. CI 로 자동화할 때 넣는다.
- 결정 번호는 041 이다(040 은 `feat/analytics` 브랜치가 쓴다).
- "테스트앱은 TestFlight 에만" 을 기술적으로 막는 설정은 없다. App Store Connect 에서 테스트앱을 "심사에 제출" 하지 않는 운영 규칙으로 지킨다. 내부 테스터(App Store Connect 사용자)는 바로 받는다. 외부 테스터는 첫 빌드에 베타 앱 심사가 붙는다.

## 범위 밖
- App Store 심사 제출, 스토어 설명 · 스크린샷(1.0.0 태스크 11).
- 안드로이드(플레이) 업로드. 테스트앱은 TestFlight 에만 올린다(소유자). 운영 안드로이드는 따로 계획한다.
- CI 자동 빌드 · 제출(`develop` 에 합치면 TestFlight 에 올라가는 것).
- OTA 업데이트(`eas update`). `expo-updates` 가 없다.
- 테스트앱 전용 아이콘, 앱 안의 "테스트" 표시.
- 유니버설 링크 · 앱 링크(결정 037 의 7번).
- 개발 빌드용 세 번째 변형.

## 전역 제약
- EAS CLI 는 `npx eas-cli@latest <명령>` 으로 부른다(AGENTS.md). eas.json 의 `cli.version` `>= 27.0.0` 은 유지한다.
- 새 패키지는 설치하지 않는다(필요해지면 `npx expo install` 만).
- Expo · EAS 설정 키는 쓰기 전에 공식 문서로 확인한다. app variants https://docs.expo.dev/tutorial/eas/multiple-app-variants/ · eas.json https://docs.expo.dev/eas/json/ · 환경 변수 https://docs.expo.dev/eas/environment-variables/ · 앱 버전 https://docs.expo.dev/build-reference/app-versions/ · iOS 제출 https://docs.expo.dev/submit/ios/
- 키 · 클라이언트 ID 값은 문서 · 커밋 · 실행 기록 · 대화에 적지 않는다. 이름만 적는다. `.env` 는 읽지 않는다(settings deny).
- 작업은 브랜치 `feat/testflight-test-app` 에서 하고, `develop` 으로 PR 을 낸다. 보호 브랜치에 직접 쓰지 않는다. 합치기 전에 CI 통과를 확인한다.
- 커밋은 한국어 Conventional Commits, 한 태스크 = 한 커밋. 결정 문서(`docs:`)와 설정(`build:`/`feat:`)은 커밋을 나눈다.

## 소유자만 할 수 있는 준비
실행 세션은 이 표의 항목이 필요한 태스크에서 막히면 `상태: 차단` 으로 적고 멈춘다. 그 태스크에 필요한 항목만 소유자에게 묻는다.

| # | 할 일 | 어디서 | 필요한 태스크 |
|---|---|---|---|
| U1 | **테스트용 카카오 앱**: 앱 "별명 테스트", 플랫폼 iOS(번들 ID `com.byeolmyeong.app.test`) · Web(`https://app.staging.byeolmyeong.com`), 카카오 로그인 + OpenID Connect 켜기, 동의 항목은 운영 카카오 앱과 같게(이메일 포함 — 서버가 이메일을 필수로 받는다), 리디렉트 URI `https://app.staging.byeolmyeong.com/auth/kakao`(로컬 개발도 이 앱으로 하려면 `http://localhost:8081/auth/kakao` 도), 클라이언트 시크릿 | 카카오 개발자 콘솔 | 7 |
| U2 | **구글 iOS OAuth 클라이언트**: 번들 ID `com.byeolmyeong.app.test`. 웹 클라이언트는 지금 것을 그대로 쓴다(서버 aud 가 웹 클라이언트 ID) | Google Cloud 콘솔 | 7 |
| U3 | **스테이징 서버 환경 변수**: `APPLE_CLIENT_IDS` 에 `com.byeolmyeong.app.test` 를 더한다. 이건 이미 들어가 있다는 서버 세션 알림이 있었다(2026-11-19). 서버 환경이라 이 세션에서 직접 확인하지는 못했다. 카카오 키 교체는 서버 세션이 인수인계(서버 저장소 `.local/handoff.md`)에 적어 두었고, 소유자가 값과 시점을 주면 넣는다. `KAKAO_REST_API_KEY` · `KAKAO_NATIVE_APP_KEY` · `KAKAO_CLIENT_SECRET` · `KAKAO_ADMIN_KEY` · `KAKAO_REDIRECT_URIS` 는 U1 값으로 바꾼다. **같은 날** 스테이징 웹(Vercel 프로젝트 `byeolmyeong-app-staging`)의 `EXPO_PUBLIC_KAKAO_REST_API_KEY` 도 U1 의 REST 키로 바꾸고 다시 배포한다. 하루라도 어긋나면 그동안 스테이징 웹의 카카오 로그인이 깨진다. 스테이징 서버 배포(닉네임 가입, 서버 결정 025)와 같은 날에 하면 한 번에 끝난다 | 서버 배포 환경 · Vercel | 7 |
| U4 | **EAS 공급자 값(preview 환경)**: 아래 명령의 `<값>` 을 채워 소유자가 직접 실행한다. `! npx eas-cli@latest env:create --environment preview --visibility plaintext --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <값>`, 같은 모양으로 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`(U2) · `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`(U1 의 네이티브 앱 키) | 터미널 | 7 |
| U5 | **첫 빌드 · 제출 실행**: 애플 로그인이 대화형이라 소유자가 직접 실행한다(태스크 7의 명령) | 터미널 | 7 |
| U6 | **TestFlight 에서 설치 · 로그인 확인** | 아이폰 | 7 |

## 태스크

### 1. adr-041-test-and-production-apps · 상태: 대기
- 읽을 것: 이 파일의 "인터뷰 결과" · "내 결정" · "범위 밖", docs/decisions/037-web-deploy-vercel.md(형식 · 주소), docs/decisions/034-social-login-platforms.md
- 할 것: `docs/decisions/041-test-app-testflight-only.md`. 머리말은 037 과 같은 모양(type: decision · tags · status: active · last_reviewed · superseded_by). 결정 절에 두 앱 표를 둔다. 열은 이름 · 번들 ID(= 안드로이드 패키지) · scheme · 서버 · 웹 · 카카오 앱 · EAS 빌드 프로필 / EAS 환경 · 올리는 곳. 개발 빌드는 운영 ID 그대로라는 것, "TestFlight 에만" 은 운영 규칙으로 지킨다는 것, 스테이징 카카오를 테스트 카카오 앱으로 옮긴다는 것도 적는다. 대안: 앱 하나 + 앱 안의 서버 전환 / 카카오 앱 하나 공유 / 개발 변형을 넣은 세 변형.
- 주는 것: 결정 041(뒤 태스크 · 문서가 "결정 041" 로 가리킨다)
- 하지 말 것: 037 · 034 본문 고치기. 이유: 기존 ADR 은 고쳐 쓰지 않는다(golden-rules).
- 검증: `ls docs/decisions/041-*` → 파일 하나. `grep -c 'com.byeolmyeong.app.test' docs/decisions/041-*.md` → 1 이상
- 실행 패턴: 혼자
- 결과 요약:

### 2. app-variant-config · 상태: 대기
- 읽을 것: 결정 041, `app.config.ts`, `app.json`, Expo app variants 문서(전역 제약의 주소)
- 할 것: `app.config.ts` 의 기본 내보내기가 `process.env.APP_VARIANT` 를 읽는다. 없음 · 빈 값 · `production` → 지금 결과 그대로. `test` → `ios.bundleIdentifier` · `android.package` 를 `com.byeolmyeong.app.test` 로, `name` 을 `별명 테스트` 로, `scheme` 을 `byeolmyeong-test` 로. 그 밖의 값 → `Error` 를 던진다(메시지에 받은 값). 구글 · 카카오 플러그인을 넣는 지금 로직은 그대로 둔다.
- 주는 것: `APP_VARIANT=test` 하나로 테스트앱 설정이 나온다(태스크 4 의 eas.json 이 쓴다)
- 하지 말 것: `app.json` 의 운영 값(번들 ID · 이름 · scheme)을 바꾸기. `src/` 에서 `APP_VARIANT` 읽기. 이유: 요청 밖이다. 앱 동작은 서버 주소 환경 변수로 이미 갈린다.
- 검증(바꾸기 **전에** 먼저 돌려, 첫 줄이 운영 값으로 나오는 것을 본다):
  - `APP_VARIANT=test npx expo config --type public --json | node -e 'const c=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(c.name,c.scheme,c.ios.bundleIdentifier,c.android.package)'` → `별명 테스트 byeolmyeong-test com.byeolmyeong.app.test com.byeolmyeong.app.test`
  - 같은 명령을 `APP_VARIANT` 없이 → `별명 byeolmyeong com.byeolmyeong.app com.byeolmyeong.app`
  - `APP_VARIANT=tset npx expo config --type public` → 0 이 아닌 종료 코드, 메시지에 `tset`
  - `npx tsc --noEmit && npx expo lint` 통과, `npx expo export --platform web` exit 0(Vercel 빌드는 영향 없음)
- 실행 패턴: 혼자
- 결과 요약:

### 3. eas-project-link · 상태: 대기
- 읽을 것: 결정 041, `app.json`
- 할 것: `npx eas-cli@latest init --account monkeygardens-team` 로 `@monkeygardens-team/byeolmyeong` 프로젝트를 만들어 잇는다. `app.config.ts` 가 동적이라 CLI 가 설정에 직접 못 쓰면, 출력된 프로젝트 ID 를 `app.json` 의 `expo.extra.eas.projectId` 에, `"monkeygardens-team"` 을 `expo.owner` 에 손으로 넣는다.
- 주는 것: EAS 프로젝트 ID(`app.json`). 태스크 4 · 5 의 `eas config` · `eas env` 가 이 연결을 쓴다
- 하지 말 것: 개인 계정 `monkeygarden` 에 만들기. 이유: 소유자가 팀 계정을 골랐다.
- 검증: `npx eas-cli@latest project:info` → fullName `@monkeygardens-team/byeolmyeong`, ID 가 `app.json` 의 값과 같다
- 차단 가능: 로그인이 만료됐으면 소유자에게 `! npx eas-cli@latest login` 을 부탁한다.
- 실행 패턴: 혼자
- 결과 요약:

### 4. eas-store-profiles · 상태: 대기
- 읽을 것: 결정 041, `eas.json`, `app.json`, eas.json · 앱 버전 문서(전역 제약의 주소), 태스크 2 · 3 결과
- 할 것: `eas.json` 에 `cli.appVersionSource: "remote"` 를 넣는다. 빌드 프로필 둘을 더한다. `test` = 배포 `store`, 환경 `preview`, `autoIncrement: true`, `env.APP_VARIANT: "test"`. `production` = 배포 `store`, 환경 `production`, `autoIncrement: true`. submit 프로필은 `test` · `production` 을 같은 이름으로 둔다(`--auto-submit` 이 같은 이름을 찾는다). `ascAppId` 는 넣지 않는다. `app.json` 에는 `ios.config.usesNonExemptEncryption: false` 를 넣는다. `development` · `development-simulator` 는 그대로 둔다.
- 주는 것: 빌드 프로필 `test` · `production`(태스크 7 · 8 의 명령)
- 하지 말 것: `eas build` · `eas submit` 실행. 이유: 애플 로그인 · 비용이 드는 외부 작업이다(태스크 7 에서 소유자가 한다).
- 검증:
  - `npx eas-cli@latest config --platform ios --profile test` → 빌드 프로필에 `environment: preview` · `APP_VARIANT: test`, 앱 설정의 `bundleIdentifier` 가 `com.byeolmyeong.app.test`
  - `--profile production` → `com.byeolmyeong.app`, `environment: production`
  - `--profile development` → `com.byeolmyeong.app`(바뀌지 않음)
- 실행 패턴: 혼자
- 결과 요약:

### 5. eas-env-urls · 상태: 대기
- 읽을 것: 결정 037 "결정 4"(환경 변수), EAS 환경 변수 문서, 태스크 3 결과
- 할 것: EAS 환경 변수 넷을 만든다(visibility `plaintext`). preview 에는 `EXPO_PUBLIC_API_URL=https://api-staging.byeolmyeong.com` · `EXPO_PUBLIC_WEB_URL=https://app.staging.byeolmyeong.com`. production 에는 `EXPO_PUBLIC_API_URL=https://api.byeolmyeong.com` · `EXPO_PUBLIC_WEB_URL=https://app.byeolmyeong.com`. 저장소 파일은 바뀌지 않으므로 커밋 없이 실행 기록에만 남긴다.
- 주는 것: 테스트앱 → 스테이징 서버, 운영앱 → 운영 서버
- 하지 말 것: `EXPO_PUBLIC_DEV_SESSION` · `EXPO_PUBLIC_USE_FIXTURES` 를 어느 환경에든 넣기. 이유: 개발용이다(결정 037). 공급자 값 넣기. 이유: 소유자가 한다(U4).
- 검증: `npx eas-cli@latest env:list --environment preview` → 두 이름과 스테이징 주소. `--environment production` → 두 이름과 운영 주소
- 실행 패턴: 혼자
- 결과 요약:

### 6. docs-commands · 상태: 대기
- 읽을 것: `CLAUDE.md`(80줄 제한), `.env.example`, 결정 041
- 할 것: `CLAUDE.md` 명령어 절에 테스트앱 한 줄을 넣는다: `npx eas-cli@latest build --profile test --platform ios --auto-submit`(TestFlight 에만, 결정 041). 운영앱은 `--profile production` 이라고 짧게 붙인다. `.env.example` 머리에 한 줄을 더한다: EAS 빌드는 같은 이름을 EAS 환경 변수(preview = 테스트앱, production = 운영앱)에서 받는다.
- 주는 것: 다음 세션이 명령을 CLAUDE.md 에서 찾는다
- 하지 말 것: CLAUDE.md 80줄 넘기기. 이유: 이 파일의 규칙이다.
- 검증: `wc -l CLAUDE.md` → 80 이하. `grep -n 'profile test' CLAUDE.md` → 한 줄. `grep -n 'preview' .env.example` → 한 줄
- 실행 패턴: 혼자
- 결과 요약:

### 7. first-testflight-upload · 상태: 대기(U1~U4 가 끝나야 시작)
- 읽을 것: 태스크 2~6 결과, 이 파일 "소유자만 할 수 있는 준비"
- 할 것: 태스크 1~6 을 PR 로 `develop` 에 합친다(CI 통과 확인 뒤, 합치기는 소유자 확인). 그다음 소유자가 `! npx eas-cli@latest build --profile test --platform ios --auto-submit` 을 실행한다. 인증서 · 프로비저닝 프로필 · 번들 ID 등록(Sign in with Apple 포함)은 EAS 에 맡긴다. App Store Connect 에 앱이 없어 만들지 물으면, 이름은 "별명 테스트", 기본 언어는 한국어.
- 하지 말 것: App Store Connect 에서 테스트앱을 심사에 제출하기. 이유: 테스트앱은 TestFlight 에만(소유자).
- 검증:
  - `npx eas-cli@latest build:list --platform ios --limit 1` → 상태 finished, 프로필 `test`, 앱 식별자 `com.byeolmyeong.app.test`
  - App Store Connect → "별명 테스트" → TestFlight 에 빌드가 "테스트 가능" 으로 보인다(소유자 스크린샷)
  - 아이폰(U6): TestFlight 에서 설치 → 홈 화면 이름 "별명 테스트" → 애플 · 구글 · 카카오(카카오톡이 깔린 폰에서) 로그인 → 가입 → 홈. 카카오 로그인이 통과하면, 빌드가 테스트 카카오 키를 받았고 스테이징 서버도 그 키를 받는다는 뜻이다
- 실행 패턴: 혼자(소유자 단계가 끼어 있다)
- 결과 요약:

### 8. production-upload · 상태: 차단(운영 서버와 앱의 가입 계약이 맞을 때까지)
- 차단 사유: 처음 조건은 "운영 서버가 뜰 때까지"(소유자 2026-11-19)였다. 그 뒤 운영 서버가 떴다. 2026-11-19 `https://api.byeolmyeong.com/health` 가 200 을 돌려주는 것을 확인했다(서버 커밋 84701db). 그런데 운영 서버에는 아직 이메일 필수(서버 PR #19)와 닉네임(서버 PR #22, 초안)이 없다. 둘 다 `develop` 에만 있다. `develop` 에서 만든 운영앱이 새 가입 화면으로 운영 서버를 부르면 계약이 어긋난다. 그래서 두 PR 이 운영 서버에 들어간 뒤 올린다. 시작하기 전에 서버 저장소 `.local/handoff.md` 에서 운영 서버에 무엇이 들어갔는지 확인한다.
- 읽을 것: 결정 041, 태스크 4 · 5 결과, 서버 저장소 `.local/handoff.md`
- 준비(소유자): 운영 번들 ID 용 구글 iOS OAuth 클라이언트(이미 있으면 그 값). EAS production 환경의 공급자 값(운영 카카오 앱 네이티브 키 · 구글 웹 · 구글 iOS — U4 와 같은 명령에 `--environment production`). 운영 서버의 `APPLE_CLIENT_IDS` 에 `com.byeolmyeong.app`.
- 할 것: 소유자가 `! npx eas-cli@latest build --profile production --platform ios --auto-submit` 을 실행한다. 운영앱 TestFlight 까지만 하고, App Store 심사 제출은 범위 밖이다.
- 검증: `build:list` 에 프로필 `production` · `com.byeolmyeong.app`. 테스트앱과 운영앱을 한 아이폰에 같이 깔고, 두 앱 모두 카카오톡 로그인이 자기 앱으로 돌아오는지 본다
- 실행 패턴: 혼자
- 결과 요약:

## 검증 (전체 완료 판정)
- `/verify` 표(타입 · 린트 · 테스트 · 웹 빌드) 통과. 코드 변경은 `app.config.ts` 뿐이지만 표를 그대로 돌린다.
- 태스크 2 의 `expo config` 세 줄 출력이 기대값과 같다.
- 태스크 4 의 `eas config` 세 프로필 출력이 기대값과 같다.
- 태스크 7: TestFlight 빌드 하나와 아이폰 로그인 한 바퀴. 태스크 8 은 차단인 채로 완료로 본다.

## 리뷰 초점 (어떤 태스크의 테스트도 안 치는 입력 · 조건)
1. `APP_VARIANT` 오타 · 대소문자(`Test`) → 에러가 나야 한다. 태스크 2 검증에 `APP_VARIANT=Test` 한 줄을 더한다.
2. `APP_VARIANT` 가 없는 Vercel 빌드에서 바뀐 것이 없다. 태스크 2 에서 바꾸기 전 · 뒤의 `npx expo config --type public --json` 을 비교해 차이가 없음을 본다.
3. 로컬 `.env`(운영 카카오 앱 값)가 테스트 빌드에 섞이지 않는다. `.env` 가 `.gitignore` 에 있어 EAS 로 올라가지 않는지 태스크 7 전에 `git check-ignore .env` 로 본다. 최종 확인은 태스크 7 의 카카오 로그인이다(스테이징 서버는 테스트 카카오 키만 aud 로 받는다).
4. 개발 빌드 프로필이 그대로다(태스크 4 검증의 `--profile development`).
5. 두 앱을 한 폰에 깔면 scheme 이 겹치지 않는다(태스크 2 출력). 카카오 돌아오기 scheme 은 카카오 키가 달라 다르다. 실제 확인은 태스크 8.

## 자동 반복
하지 않는다. 외부 계정 · 소유자 단계(U1~U6)가 태스크 사이에 끼어 있다.

## 위험 · 되돌리기
- App Store Connect 앱 기록과 번들 ID 등록은 되돌릴 수 없다. 앱은 지워도 번들 ID 는 그 팀에 남는다. 앱 이름은 나중에 바꿀 수 있다.
- 스테이징을 테스트 카카오 앱으로 옮기면 카카오 사용자 번호가 바뀐다. 그래서 스테이징에서 운영 카카오 앱으로 가입했던 사람은 새 계정으로 잡힌다. 스테이징 데이터라 받아들인다.
- 스테이징 서버와 스테이징 웹의 카카오 키는 같은 날 바꾼다(U3).
- 코드: `git revert`(`app.config.ts` · `eas.json` · `app.json`). EAS 환경 변수: `eas env:delete`. EAS 프로젝트는 지우지 않고 둔다.

## 실행 기록
(아직 없음)

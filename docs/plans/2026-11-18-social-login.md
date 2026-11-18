---
type: plan
status: approved
tags: [로그인, 소셜 로그인, 가입, 만 14세, 세션]
last_reviewed: 2026-11-18
---
# 소셜 로그인(애플 · 카카오 · 구글)과 가입 — 서버 + 앱(웹 · iOS · Android)

> 상태: 승인 2026-11-18 · 기준 2026-11-18 · 서버 계획 태스크 16(social-login)과 앱 계획 태스크 4(login)를 이 파일이 대신한다

## 목표
- 무엇: 서버가 애플 · 카카오 · 구글 로그인을 확인해 세션을 주고, 앱(웹 · iOS · Android)에 스플래시 → 로그인 → 출생 정보(만 14세 판정) 가입 흐름과 로그아웃을 넣는다.
- 누구: 출시 후의 실제 사용자. 지금의 개발용 자동 로그인(`POST /auth/dev`)을 대신한다(개발용은 로컬에만 남는다).
- 끝나면: 실제 계정으로 쓰고, 개발 서버 배포 전 숙제(서버 계획 "배포 전 확인" 2 · 3번 — 개발용 로그인 안전장치, 세션 만료 · 로그아웃)가 같이 끝난다.

## 결정된 전제
- 가입은 스플래시 직후 필수, 로그인 없이 열리는 화면은 공유 페이지뿐: 앱 `docs/decisions/009-signup-first-kakao-age14.md`
- 개발용 로그인으로 먼저 만들고 브랜딩 뒤 소셜 로그인: 서버 `docs/decisions/005-dev-auth-first.md`, 앱 `docs/decisions/017-dev-session-and-boundaries.md`
- 앱 이름 "별명" 유지(브랜딩 끝): 앱 `docs/decisions/032-keep-name-byeolmyeong.md` (브랜치 `feat/brand-dark-design-system`, 아직 main 에 없음)
- 소유자는 토큰에서만, 남의 자원은 404, 출생 정보는 로그에 남기지 않는다: 두 저장소 `docs/golden-rules.md`
- 서버 의존 규칙(ArchUnit): 서버 `docs/architecture.md` "의존 규칙". `auth` 는 기능 패키지를 모르고 `birth` · `web` 은 쓸 수 있다
- 앱 의존 규칙(ESLint): 앱 `docs/architecture.md` "의존 규칙"

## 인터뷰 결과
| 질문 | 답 (2026-11-18 소유자) | 영향 |
|---|---|---|
| 로그인 수단 | 애플 · 카카오 · 구글 먼저, 네이버는 나중 | 결정 009 그대로. 네이버는 범위 밖 |
| 만 14세 확인 | 출생일로 서버가 판정 | 가입을 "로그인 → 가입권 → 출생 정보와 함께 가입 완료" 두 단계로. 결정 009 · 앱 F7 의 [확인 필요]가 풀린다 |
| 앱 범위 | 웹 · iOS · Android 한 번에 | EAS 개발 빌드 설정과 기기 확인이 들어온다 |
| 웹 로그인 유지 | 쿠키(httpOnly)로 계속 유지 | 서버가 쿠키 세션을 받는다. 웹 앱과 서버는 같은 도메인 아래 주소여야 한다(호스팅 제약) |
| 애플 개발자 계정 | 있다 | 애플 등록을 바로 할 수 있다 |

## 내 결정 (묻지 않고 고른 기본값)
- 가입 두 단계: `POST /auth/login` 은 계정이 있으면 세션, 없으면 30분짜리 1회용 가입권(`signupToken`)을 준다. `POST /auth/signup` 이 가입권 + 출생 정보를 받아 만 14세 이상일 때만 계정과 출생 정보를 한 트랜잭션에 만든다 — ID 토큰은 애플처럼 수명이 짧을 수 있어 출생 정보를 입력하는 동안 만료될 수 있다 — 틀리면 비용: 가입권 테이블 하나.
- 만 14세: 한국 시간 오늘 기준 만 나이 14 이상. 2월 29일생은 평년에 3월 1일에 한 살 먹는다(`Period.between` 기준) — 틀리면 비용: 함수 하나.
- 세션 만료: 마지막 사용 후 90일. 마지막 사용 시각은 하루에 한 번만 고쳐 쓴다 — 틀리면 비용: 설정값 하나.
- 웹 쿠키: 이름 `bm_session`, `HttpOnly; Secure; SameSite=Lax; Path=/`, Domain 속성 없음(서버 주소에만). 로컬 http 용으로 `Secure` 만 설정(`SESSION_COOKIE_SECURE`)으로 끈다. 쿠키로 인증된 GET 이 아닌 요청은 `Origin` 이 허용 목록에 있어야 한다 — 틀리면 비용: 인터셉터 몇 줄.
- 앱이 쿠키를 원할 때: 로그인 · 가입 · 개발용 로그인 요청 본문에 `cookie: true`. 그때 응답 본문에는 토큰이 없다.
- 안드로이드에는 애플 로그인을 두지 않는다(심사 지침 4.8 은 iOS 앱 대상). 애플로 가입한 사람은 아이폰 · 웹에서 들어온다 — 틀리면 비용: 안드로이드용 애플 웹 로그인(서버 리디렉트 경로 하나)을 나중에 붙인다.
- 공급자 토큰 확인 라이브러리: `com.nimbusds:nimbus-jose-jwt` 하나만 더한다(JWKS 캐시 · RS256/ES256). Spring Security 의 웹 쪽은 들이지 않는다(결정 014 와 같은 이유).
- 카카오: 앱은 네이티브 SDK 로 ID 토큰을, 웹은 인가 코드를 받는다. 웹의 코드 → 토큰 교환은 서버가 REST API 키 + 클라이언트 시크릿으로 한다(카카오 문서: 토큰 요청은 서비스 서버가 한다).
- 탈퇴: 카카오 계정은 지우기 전에 어드민 키로 연결 끊기(카카오 문서상 필수), 애플 계정은 저장해 둔 refresh token 을 철회(심사 지침 5.1.1(v) 의 "should"). 둘 다 실패해도 계정은 지우고 구조화 로그를 남긴다 — 틀리면 비용: 실패 시 다시 시도하는 길.
- 애플 refresh token 은 로그인 때 authorization code(5분 유효)를 서버가 바로 교환해 `apple_tokens` 에 둔다. 교환이 실패해도 로그인은 된다.
- 애플 서버 알림(2026-01-01 부터 한국 개발자는 Services ID 등록 때 필수): `POST /auth/apple/notifications`. `consent-revoked` → 그 계정의 세션 모두 삭제, `account-delete` → 계정 삭제.
- nonce 는 이번에 넣지 않는다 — ID 토큰은 TLS 로만 오가고 수명이 짧다 — 틀리면 비용: 서버 nonce 발급 경로 하나 + 앱 세 곳.
- 개발용 세션(`EXPO_PUBLIC_DEV_SESSION=1`)은 지금처럼 자동으로 들어간다. 로그인 흐름은 이 값을 끄고 확인한다 — 화면 확인 스크립트(`.scratch/syn.mjs`)가 그대로 돈다.
- 구글 웹은 구글 공식 웹 버튼(Google Identity Services)을 쓴다. `@react-native-google-signin` 의 웹 기능은 유료판이다.
- 공급자 ID(비밀 아님)는 `EXPO_PUBLIC_*` 환경 변수로 받고, 빌드 설정에 필요한 것은 `app.config.ts` 가 `app.json` 위에 얹는다.
- 앱 결정 번호는 034 를 쓴다(033 은 `feat/brand-dark-design-system` 이 쓴다). 서버는 021(020 은 같은 날 호스팅 결정이 썼다).

## 범위 밖
- 네이버 로그인 (소유자: 나중).
- 소개 화면 2~3장 — 결정 009 는 "첫 화면 이탈이 크면" 둔다.
- 약관 · 개인정보 처리방침 동의 화면 — 문안이 아직 자리표시다(앱 release "사용자만 할 수 있는 준비"). [확인 필요] 출시 전 별도 계획.
- 카카오 연결 해제 웹훅, 안드로이드 애플 로그인, nonce.
- 테스트 · 운영 서버 호스팅. 단, 애플 웹 로그인과 Services ID 등록(서버 알림 주소)은 https 서버가 있어야 해서 그때까지 차단된다.
- 서버 "배포 전 확인" 1 · 4 · 5 · 6번(계정별 생성 속도 제한 등).

## 사용자 준비 (차단 — 소유자만 할 수 있다)
값은 문서에 적지 않고 `.env` 에만 넣는다. 아래 이름으로 넣는다.
1. ~~도메인을 알려 준다~~ 완료(2026-11-18): 도메인 `byeolmyeong.com` → 번들 ID · 안드로이드 패키지 `com.byeolmyeong.app`. 앱스토어에 올린 뒤에는 못 바꾼다.
2. 구글 클라우드: OAuth 동의 화면, 클라이언트 ID 셋 — 웹(승인된 JavaScript 원본 `http://localhost:8081` + 테스트 · 운영 웹 주소), iOS(번들 ID), Android(패키지 이름 + EAS 서명 SHA-1). → 서버 `GOOGLE_CLIENT_IDS`(웹 클라이언트 ID), 앱 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` · `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
3. 애플: App ID(번들 ID)에 Sign in with Apple 켜기, Sign in with Apple 키(.p8), Services ID(웹 — 도메인 · return URL · 서버 알림 주소 `https://<서버 주소>/auth/apple/notifications`, 테스트 서버 뒤). → 서버 `APPLE_CLIENT_IDS`(번들 ID, Services ID) · `APPLE_TEAM_ID` · `APPLE_KEY_ID` · `APPLE_PRIVATE_KEY`, 앱 `EXPO_PUBLIC_APPLE_SERVICES_ID`.
4. 카카오 개발자: 앱 "별명", 플랫폼 Web(사이트 도메인) · iOS(번들 ID) · Android(패키지 + 키 해시), 카카오 로그인 · OpenID Connect 켜기, 리디렉트 URI `http://localhost:8081/auth/kakao` + 테스트 · 운영 웹 주소, 클라이언트 시크릿. → 서버 `KAKAO_REST_API_KEY` · `KAKAO_CLIENT_SECRET` · `KAKAO_NATIVE_APP_KEY` · `KAKAO_ADMIN_KEY` · `KAKAO_REDIRECT_URIS`, 앱 `EXPO_PUBLIC_KAKAO_REST_API_KEY` · `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`.
5. Expo 계정과 `! npx eas-cli@latest login`. 아이폰(개발자 모드) · 안드로이드 기기 한 대씩, 또는 시뮬레이터.

## 전역 제약
- 서버: Kotlin · JVM 21 · Spring Boot 4.1.2 · Gradle Kotlin DSL. 새 의존성은 `nimbus-jose-jwt` 하나(버전은 태스크 S4 시작 때 Maven Central 의 최신 안정판, 결정 021 에 적는다).
- 서버 마이그레이션은 추가만: V16 · V17 · V18. 기존 열을 지우지 않는다.
- 앱: Expo SDK 58. 패키지는 `npx expo install` 로만. Expo · RN API 를 쓰기 전에 `https://docs.expo.dev/versions/v58.0.0/` 해당 페이지를 읽는다(AGENTS.md).
- 앱 문구는 `src/content/strings.ts`, 색 · 글자 · 간격은 `src/constants/theme.ts` 에서만.
- 토큰(공급자 · 세션 · 가입권) 원문과 출생 정보를 로그에 남기지 않는다. 세션 · 가입권은 DB 에 SHA-256 해시만.
- 오류 응답은 `{ "error": "<대문자_코드>" }`. 새 코드: `INVALID_ID_TOKEN`(401) · `INVALID_CODE`(401) · `PROVIDER_UNAVAILABLE`(502) · `SIGNUP_EXPIRED`(401) · `UNDER_AGE`(403) · `FORBIDDEN_ORIGIN`(403).
- 브랜치 `feat/social-login`(두 저장소), 워크트리 `../.wt-api-login` · `../.wt-app-login`. 포트 8082 · 5435 · 9092 는 쓰지 않는다.

## 태스크
서버(S, 저장소 `byeolmyeong-api`)를 먼저 하고 앱(A, `byeolmyeong-app`)을 한다. 경로는 각 저장소 기준.

### S1. server-decision-and-contract · 상태: 완료
- 읽을 것: 이 파일 "인터뷰 결과" · "내 결정", `docs/architecture.md`(API 계약 표 · `auth` 설명), `docs/decisions/005-dev-auth-first.md`, `.env.example`
- 할 것: `docs/decisions/021-social-login-signup-cookie.md`(처음엔 020 — S4 기록 참고)(결정 005 의 "나중"을 채운다: 가입 두 단계 · 출생일 만 14세 · 쿠키 세션 · 90일 만료 · 탈퇴 시 카카오 연결 끊기와 애플 철회 · 애플 서버 알림 · 안드로이드 애플 없음 · nonce 없음). `docs/architecture.md` 계약 표를 아래로 고친다:
  - `POST /auth/login` 없음 `{ provider: GOOGLE|APPLE|KAKAO, idToken? , code?, redirectUri?, authorizationCode?, cookie? }` — `code`·`redirectUri` 는 KAKAO 웹만, `authorizationCode` 는 APPLE 만 → 200 `{ status: SIGNED_IN, token? }` | `{ status: SIGNUP_REQUIRED, signupToken, expiresAt }`
  - `POST /auth/signup` 없음 `{ signupToken, date, time|null, placeId|null, cookie? }` → 201 `{ token? }` · 403 `UNDER_AGE`(계정 · 출생 정보 0건) · 401 `SIGNUP_EXPIRED` · 400 은 `POST /charts` 와 같다
  - `GET /auth/session` 세션 → 204 · `DELETE /auth/session` 세션 → 204(쿠키도 지운다)
  - `POST /auth/apple/notifications` 없음 `payload=<애플 JWT>` → 200
  - 세션 줄: `Authorization: Bearer` 또는 쿠키 `bm_session`
  `.env.example` 에 이름 추가(사용자 준비 2~4번의 서버 이름 + `SESSION_COOKIE_SECURE`). 서버 계획 `docs/plans/2026-11-10-api-mvp.md` 태스크 16 에 "→ 앱 저장소 docs/plans/2026-11-18-social-login.md" 한 줄.
- 주는 것: 위 계약(뒤 태스크 전부의 기준), 결정 021
- 하지 말 것: 코드. 이유: 결정이 코드보다 먼저다(golden rules).
- 검증: `grep -n "auth/signup\|bm_session" docs/architecture.md` → 두 곳 이상
- 실행 패턴: 혼자
- 결과 요약: 서버 `c6fb66b` — 결정 021(이 커밋에서는 020, `e9bfe1c` 에서 옮김), `docs/architecture.md` 계약 표(`/auth/login` · `/auth/signup` · `/auth/session` · `/auth/apple/notifications`, 쿠키 `bm_session`, "로그인과 가입" 절), `.env.example` 이름, api-mvp 태스크 16 → 이 파일.

### S2. session-expiry-logout · 상태: 완료
- 읽을 것: `src/main/kotlin/com/byeolmyeong/api/auth/AuthService.kt` · `Session.kt` · `AuthController.kt`, `src/main/resources/db/migration/V2__accounts_sessions_profiles.sql`, `src/test/kotlin/com/byeolmyeong/api/auth/AuthApiIntegrationTest.kt`
- 할 것: `V16__session_last_used.sql` — `sessions.last_used_at timestamptz not null default now()`. `AuthService.ownerOf(token)` 는 `last_used_at` 이 90일(`byeolmyeong.auth.session-days=90`)보다 오래되면 null 이고 그 세션을 지운다. 하루 넘게 지났을 때만 `last_used_at` 을 고친다. `GET /auth/session` 204, `DELETE /auth/session` 204(그 세션만 지움). 두 경로는 세션 필요(공개 목록에 넣지 않는다).
- 주는 것: `AuthService.logout(token: String)`, 설정 `byeolmyeong.auth.session-days`
- 하지 말 것: 다른 기기의 세션까지 지우기. 이유: 로그아웃은 이 기기만이다.
- 검증: 테스트 먼저 — 91일 지난 세션 401, 89일 세션 200, 로그아웃 뒤 같은 토큰 401, 다른 세션은 그대로. `./gradlew test --tests '*Auth*'` 통과
- 실행 패턴: 혼자
- 결과 요약: 서버 `046671e` — V16 `sessions.last_used_at`, `SessionRepository.use`(90일 만료 · 하루 한 번 갱신), `AuthService.logout`, `CurrentOwner.sessionToken()`, `GET`·`DELETE /auth/session`.

### S3. web-cookie-session · 상태: 완료
- 읽을 것: S2 결과, `auth/Session.kt`, `web/` 의 CORS 설정(`byeolmyeong.cors.allowed-origins`), `docs/architecture.md` "브라우저의 다른 출처 요청"
- 할 것: `SessionInterceptor` 가 `Authorization: Bearer` 가 없으면 쿠키 `bm_session` 을 읽는다. 쿠키로 인증된 GET 이 아닌 요청은 `Origin` 이 `allowed-origins` 에 없으면 403 `FORBIDDEN_ORIGIN`. 앱 경로 CORS 에 `allowCredentials=true`(관리자 경로는 그대로). 쿠키를 쓰고 지우는 한 곳 `auth.SessionCookie`(`write(response, token)` · `clear(response)`, `HttpOnly; SameSite=Lax; Path=/`, `Secure` 는 `byeolmyeong.auth.cookie-secure=${SESSION_COOKIE_SECURE:true}`). `POST /auth/dev` 가 본문 `{ cookie: true }` 면 쿠키로만 준다. `DELETE /auth/session` 은 쿠키도 지운다.
- 주는 것: `SessionCookie.write` · `clear` (S6 이 쓴다)
- 하지 말 것: 쿠키에 Domain 속성. 이유: 서버 주소에만 가면 된다. 관리자 API 에 쿠키 허용. 이유: 관리 화면은 sessionStorage 다(결정 014).
- 검증: 테스트 먼저 — 쿠키만으로 `GET /profile` 200, 쿠키 + 낯선 Origin 의 `PUT /profile` 403, 쿠키 + 허용 Origin 200, 헤더 토큰 요청은 Origin 검사 없음, `/admin/**` 는 쿠키로 401. `./gradlew test --tests '*Auth*' --tests '*Cors*'` 통과
- 실행 패턴: 혼자
- 결과 요약: 서버 `561b0ba` — `auth.SessionCookie`(write · clear · read), 세션 검사가 쿠키를 읽고 쿠키 + GET 이 아닌 요청의 Origin 확인(403 `FORBIDDEN_ORIGIN`), 앱 경로 CORS 자격 증명 허용, `/auth/dev` 의 `{ cookie: true }`, 로그아웃이 쿠키 삭제, `TokenResponse(token: String?)` + `AuthController.deliver`.

### S4. provider-id-token-verify · 상태: 완료
- 읽을 것: `docs/architecture.md` "의존 규칙"(외부 호출은 인터페이스 뒤), 공식 문서 — 구글 ID 토큰 검증(https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), 카카오 OIDC(https://developers.kakao.com/docs/latest/ko/kakaologin/utilize 의 "ID 토큰 유효성 검증"), 애플(https://appleid.apple.com/auth/keys). 각 문서에서 iss · JWKS 주소 · aud 를 확인해 결정 021 에 적는다.
- 할 것: `auth.ProviderTokenVerifier` 인터페이스(`fun verify(idToken: String): ProviderIdentity`, `ProviderIdentity(provider: Provider, subject: String)`)와 구현 셋 `GoogleTokenVerifier` · `AppleTokenVerifier` · `KakaoTokenVerifier`. 서명(JWKS, 키는 캐시), iss, aud(허용 목록: 구글 `GOOGLE_CLIENT_IDS`, 애플 `APPLE_CLIENT_IDS`, 카카오 `KAKAO_REST_API_KEY` + `KAKAO_NATIVE_APP_KEY`), exp 를 본다. 하나라도 틀리면 `InvalidIdTokenException`(→ 401 `INVALID_ID_TOKEN`), JWKS 를 못 받으면 `ProviderUnavailableException`(→ 502). 테스트는 JWKS 소스를 메모리 키로 바꿔 끼운다.
- 주는 것: `ProviderTokenVerifier`, `ProviderIdentity`, `Provider` enum(GOOGLE · APPLE · KAKAO · DEV)
- 하지 말 것: 토큰의 이메일 · 이름 저장. 이유: 계정에는 공급자 + 식별자만 둔다(V2 주석).
- 검증: 테스트 먼저 — 공급자마다 정상 통과, 서명 틀림 · 만료 · aud 다름 · iss 다름 401. `./gradlew test --tests '*TokenVerifier*'` 통과. `./gradlew test --tests '*Architecture*'` 통과
- 실행 패턴: 혼자
- 결과 요약: 서버 `f47f8c6` — `auth/ProviderToken.kt`: `Provider`(DEV · GOOGLE · APPLE · KAKAO) · `ProviderIdentity` · `ProviderTokenVerifier` · `InvalidIdTokenException` · `ProviderUnavailableException` · `providerTokenVerifier(provider, audiences, keys)` · `ProviderTokenConfig`(빈 `googleTokenVerifier` 등, 키 빈 `googleKeys` 등). 설정 `byeolmyeong.auth.{google,apple,kakao}.client-ids`. 서버 결정 번호는 021.

### S5. kakao-web-code-exchange · 상태: 완료
- 읽을 것: S4 결과, 카카오 REST API 토큰 요청(https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- 할 것: `auth.KakaoOAuthClient.exchange(code: String, redirectUri: String): String`(id_token 반환). `redirectUri` 가 `KAKAO_REDIRECT_URIS` 에 없으면 401 `INVALID_CODE`. 카카오가 4xx 면 401 `INVALID_CODE`, 5xx · 연결 실패면 502. Spring `RestClient` 를 쓰고 테스트는 `MockRestServiceServer`.
- 주는 것: `KakaoOAuthClient.exchange` (S6 이 KAKAO 웹 요청에 쓴다)
- 하지 말 것: 받은 access token 저장. 이유: ID 토큰만 쓰고 버린다.
- 검증: 테스트 먼저 — 정상 교환, 등록 안 된 redirectUri, 카카오 400, 카카오 500. `./gradlew test --tests '*Kakao*'` 통과
- 실행 패턴: 혼자
- 결과 요약: 서버 `0a4f69a` — `auth/KakaoOAuth.kt`: `InvalidCodeException`, 인터페이스 `KakaoOAuth.exchange(code, redirectUri): String`, 구현 `KakaoOAuthClient`(설정 `byeolmyeong.auth.kakao.{rest-api-key,client-secret,redirect-uris,auth-url}`). S8 의 `unlink` 는 같은 인터페이스에 더한다.

### S6. login-and-signup · 상태: 완료
- 읽을 것: S1~S5 결과, `auth/AuthService.kt`, `birth/BirthProfile.kt`(`BirthProfileService.save`), `web/BirthRequest.kt`(`BirthRequestParser.parse`), `profile/ProfileController.kt`(오류 코드 모양), `.claude/rules/multi-tenant.md`
- 할 것: `V17__signup_tickets.sql` — `signup_tickets(token_hash text pk, provider text, provider_user_id text, expires_at timestamptz)`. `POST /auth/login`: 공급자 확인(KAKAO 에 `code` 가 있으면 S5 로 교환 후 S4) → 계정 있으면 세션(`cookie` 면 S3 쿠키), 없으면 가입권(30분). `POST /auth/signup`: 가입권 확인(없거나 만료 · 사용됨 401 `SIGNUP_EXPIRED`) → 출생 정보 검증(`BirthRequestParser`) → 순수 함수 `auth.isAtLeast14(birthDate: LocalDate, today: LocalDate): Boolean`(오늘 = `Asia/Seoul`) → 미만이면 가입권을 지우고 403 `UNDER_AGE`, 이상이면 한 트랜잭션에 계정(`AccountRepository.findOrCreate`) · 출생 정보(`BirthProfileService.save`) · 세션, 가입권 삭제. 감사 기록 `USER_LOGIN`(이미 있는 `AuditAction`). 운영 기본값에서 `/auth/dev` 가 404 인 테스트(결정 005).
- 주는 것: 계약대로의 두 경로, `isAtLeast14`
- 하지 말 것: 만 14세 미만의 출생 정보 · 계정을 어떤 테이블에도 남기기. 이유: 법정대리인 동의 없는 개인정보다(결정 009).
- 검증: 테스트 먼저 — 같은 사용자 두 번 로그인 시 계정 1개, 새 사용자 → 가입권 → 가입 201, 만 14세 미만 403 과 accounts · profiles · signup_tickets 0건, 가입권 두 번 사용 401, 만료 가입권 401, 14번째 생일 당일 통과 · 전날 403, 2/29 생. `./gradlew build` 통과
- 실행 패턴: 혼자
- 결과 요약: 서버 `37f44b7` — `POST /auth/login` · `POST /auth/signup`(`AuthController`), `LoginService`(`identify` · `login` · `signup`) + `SignupTicketRepository`(V17), `isAtLeast14` · `koreaToday`(`Age.kt`), `AuthErrors`(401 `INVALID_ID_TOKEN` · `INVALID_CODE` · `SIGNUP_EXPIRED`, 403 `UNDER_AGE`, 502 `PROVIDER_UNAVAILABLE`). `LoginRequest.authorizationCode` 는 받기만 한다(S7).

### S7. apple-revoke-and-notifications · 상태: 완료
- 읽을 것: S6 결과, 애플 토큰 생성 · 철회 · 서버 알림 문서(https://developer.apple.com/documentation/signinwithapplerestapi — 브라우저로 안 읽히면 그 사실을 실행 기록에 적고 TN3194 를 본다)
- 할 것: `V18__apple_tokens.sql` — `apple_tokens(account_id uuid pk references accounts on delete cascade, refresh_token text)`. `auth.AppleClient`: `clientSecret()`(ES256 JWT, `.p8`), `exchange(code): String?`(실패면 null), `revoke(refreshToken)`. 로그인 · 가입에서 `authorizationCode` 가 오면 교환해 저장(새 사용자는 가입권에 같이 두었다가 가입 때 옮긴다 — `signup_tickets` 에 `apple_refresh_token` 열을 V18 에서 더한다). 계정 삭제 전에 철회. `POST /auth/apple/notifications`: 서명된 `payload` 를 S4 의 애플 키로 확인, `consent-revoked` → 세션 전부 삭제, `account-delete` → 계정 삭제(감사 기록 `ACCOUNT_DELETED`). 공개 경로에 추가(POST 만).
- 주는 것: 계정 삭제 순서 "외부 정리 → DB 삭제" (S8 이 같은 자리에 카카오를 더한다)
- 하지 말 것: 철회 실패로 계정 삭제를 막기. 이유: 사용자는 지웠다고 믿는다 — 실패는 `event=apple_revoke_failed` 로그.
- 검증: 테스트 먼저(`MockRestServiceServer`) — 교환 성공 시 저장, 교환 실패해도 로그인 200, 삭제 때 철회 호출, 철회 500 이어도 204, 알림 두 종류, 서명 틀린 알림 400. `./gradlew test --tests '*Apple*'` 통과
- 실행 패턴: 혼자
- 결과 요약: 서버 `a2bec88` — `auth/AppleSignIn.kt`: 인터페이스 `AppleSignIn`(exchange · revoke · notification) + `AppleSignInClient`(설정 `byeolmyeong.auth.apple.{team-id,key-id,private-key,auth-url}`), V18 `apple_tokens` + 가입권의 애플 칸, `AppleTokenRepository`, `AuthService.deleteAccount` 가 철회 후 삭제, `AuthService.appleNotification`, `POST /auth/apple/notifications`, 400 `INVALID_NOTIFICATION`. `ProviderIdentity.audience` 추가.

### S8. kakao-unlink-on-delete · 상태: 완료
- 읽을 것: S7 결과(계정 삭제 순서), 카카오 연결 끊기(https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api 의 "연결 끊기")
- 할 것: `KakaoOAuthClient.unlink(userId: String)` — `Authorization: KakaoAK <KAKAO_ADMIN_KEY>`, `target_id_type=user_id`. KAKAO 계정 삭제 전에 부른다. 실패면 `event=kakao_unlink_failed` 로그를 남기고 삭제는 진행.
- 주는 것: 없음
- 하지 말 것: 어드민 키를 로그 · 오류 응답에 넣기. 이유: 모든 사용자의 연결을 끊을 수 있는 키다.
- 검증: 테스트 먼저 — 카카오 계정 삭제 때 unlink 한 번, 구글 계정은 부르지 않음, unlink 500 이어도 204. `./gradlew build` 통과
- 실행 패턴: 혼자
- 결과 요약: 서버 `d60bd14` — `KakaoOAuth.unlink`(설정 `byeolmyeong.auth.kakao.{admin-key,api-url}`), `AccountRepository.identity`, `AuthService.deleteAccount` 순서: 애플 철회 → 카카오 연결 끊기 → 삭제.

### A1. app-decision-and-docs · 상태: 완료
- 읽을 것: S1 의 계약(서버 `docs/architecture.md`), 이 파일 "내 결정", `CLAUDE.md` 규칙 절, `docs/architecture.md` auth 줄, `docs/release-1.0.0.md` F7, `.env.example`
- 할 것: `docs/decisions/034-social-login-platforms.md`(플랫폼별 방법: 구글 — 웹 GIS · 앱 `@react-native-google-signin/google-signin`, 애플 — iOS `expo-apple-authentication` · 웹 Apple JS · 안드로이드 없음, 카카오 — 앱 네이티브 SDK · 웹 인가 코드, 웹 세션은 httpOnly 쿠키, 개발용 세션 유지). `CLAUDE.md` "세션 토큰은 기기 보안 저장소에만" 줄을 "앱은 기기 보안 저장소, 웹은 서버의 httpOnly 쿠키(앱 코드가 토큰을 만지지 않는다)"로. release F7 의 [확인 필요]를 "출생일로 서버가 판정"으로. `.env.example` 에 사용자 준비의 `EXPO_PUBLIC_*` 이름. 앱 계획 `docs/plans/2026-11-10-app-1.0.0.md` 태스크 4 에 이 파일 링크 한 줄.
- 주는 것: 결정 034
- 하지 말 것: 코드. 이유: 결정이 먼저다.
- 검증: `grep -n "httpOnly" CLAUDE.md docs/decisions/034-*.md` → 두 곳
- 실행 패턴: 혼자
- 결과 요약: 앱 `c80dcbe` — 결정 034(플랫폼별 방법 표 · 웹 쿠키 · 가입 흐름 · 로그아웃 · 개발용 세션 유지), CLAUDE.md 세션 토큰 규칙, architecture 세션 흐름, release F7, `.env.example` 의 `EXPO_PUBLIC_*` 다섯, 1.0.0 계획 태스크 4 → 이 파일.

### A2. native-build-setup · 상태: 완료
- 읽을 것: `app.json`, AGENTS.md "Building with EAS", Expo 문서 apple-authentication(v58) · google-authentication 가이드 · 카카오 RN 라이브러리 문서(`@react-native-seoul/kakao-login` — SDK 58 · 새 아키텍처 지원과 Expo config plugin 을 먼저 확인)
- 할 것: `app.json` 에 `ios.bundleIdentifier` · `android.package`(사용자 준비 1), `ios.usesAppleSignIn: true`. `app.config.ts` 가 `app.json` 을 읽고 `EXPO_PUBLIC_*` 로 플러그인 설정을 얹는다(구글 `iosUrlScheme`, 카카오 네이티브 앱 키). `npx expo install expo-apple-authentication @react-native-google-signin/google-signin @react-native-seoul/kakao-login`. `eas.json` 에 `development` 프로필(개발 빌드 · 내부 배포).
- 주는 것: 개발 빌드가 가능한 설정
- 하지 말 것: `ios/` · `android/` 를 손으로 만들기. 이유: CNG 생성물이다. 카카오 라이브러리가 SDK 58 에서 안 되면 억지로 맞추기 — 그때는 "결정:" 을 남기고 카카오도 웹 방식(인가 코드)으로 바꾼다.
- 검증: `npx expo config --type public` 에 세 플러그인과 번들 ID. `npx expo-doctor@1.21.6` 문제 0. `npx tsc --noEmit && npx expo lint` 통과
- 실행 패턴: 혼자
- 결과 요약: 앱 `52a21c5` — 패키지 다섯(`expo-apple-authentication` · `@react-native-google-signin/google-signin` · `@react-native-seoul/kakao-login` · `expo-build-properties` · `expo-dev-client`), `app.json`(번들 ID · 패키지 `com.byeolmyeong.app`, `usesAppleSignIn`, 애플 플러그인), `app.config.ts`(값이 있을 때만 구글 · 카카오 플러그인), `eas.json`(`development` · `development-simulator`).

### A3. api-client-auth · 상태: 완료
- 읽을 것: S1 계약, `src/lib/api.ts`, `src/lib/__tests__/`(fetch 흉내 방식)
- 할 것: `src/lib/api.ts` 에 `login(credential: ProviderCredential)`, `signup(signupToken: string, birth: BirthInput)`, `getSession()`, `logout()`. `ProviderCredential` = `{ provider: 'GOOGLE', idToken } | { provider: 'APPLE', idToken, authorizationCode? } | { provider: 'KAKAO', idToken } | { provider: 'KAKAO', code, redirectUri }`. 웹(`Platform.OS === 'web'`)은 모든 요청에 `credentials: 'include'` 를 붙이고 `cookie: true` 를 보내며 Authorization 헤더를 쓰지 않는다. 응답은 쓰기 전에 모양을 검사한다. `createDevSession` 도 웹이면 `cookie: true`.
- 주는 것: 위 네 함수와 `ProviderCredential` · `LoginResult`(`{ status: 'SIGNED_IN', token: string | null } | { status: 'SIGNUP_REQUIRED', signupToken }`) 타입
- 하지 말 것: 웹에서 토큰을 어디든 저장. 이유: 쿠키가 들고 있다.
- 검증: 테스트 먼저 — 웹은 credentials include · 헤더 없음, 앱은 Bearer, 두 응답 모양, 403 `UNDER_AGE` 를 오류 코드로 돌려줌. `npm test -- api` 통과
- 실행 패턴: 혼자
- 결과 요약: 앱 `9f22291` — `lib/api.ts`: `ProviderCredential` · `LoginResult` · `SignupResult`, `api.login` · `api.signup` · `api.getSession` · `api.logout`, `ApiConfig.cookieSession`(앱 인스턴스는 웹일 때 true), 401 의 `code`, `DevSession.token: string | null`.

### A4. session-store-auth · 상태: 완료
- 읽을 것: A3 결과, `src/features/auth/session-store.ts` · `use-session.ts` · `token-storage.ts` 와 그 테스트
- 할 것: `Session` 을 `{ status: 'checking' | 'signedOut' | 'signedIn' | 'signingUp', token: string | null }` 로. `start()`: 개발용 켜짐 → 지금처럼, 앱 → 보관 토큰 + `getSession()`, 웹 → `getSession()`(쿠키). `signIn(credential)` → SIGNED_IN 이면 토큰 보관(앱) · `signedIn`, SIGNUP_REQUIRED 면 가입권을 메모리에 두고 `signingUp`. `completeSignup(birth)` → 성공 `signedIn`, `UNDER_AGE` 면 가입권을 버리고 `signedOut` 과 그 사유. `signOut()` → `logout()` 후 토큰 삭제 · `signedOut`. 401 은 개발용일 때만 다시 받고, 아니면 `signedOut`. `useAuth()` 훅을 `use-session.ts` 에서 낸다.
- 주는 것: `useAuth(): { status, signIn, completeSignup, signOut, lastError }`
- 하지 말 것: 만 14세를 앱에서 계산. 이유: 서버가 판정한다(golden rules).
- 검증: 테스트 먼저 — 로그인 성공 시 토큰 저장, 로그아웃 시 삭제, 새 사용자 → signingUp → signedIn, 만 14세 미만 → signedOut, 401 → signedOut. `npm test -- auth` 통과
- 실행 패턴: 혼자
- 결과 요약: 앱 `2dd073c` — `session-store.ts`: `Session { status, token, ready, lastError }` · `SessionStatus` · `SignInOutcome`, `signIn` · `completeSignup` · `signOut` · `refresh` · `clear`. `use-session.ts`: `useAuth()`(status · lastError · signIn · completeSignup · signOut), `getSession()`, `useSession(start)`.

### A5. web-provider-credentials · 상태: 대기
- 읽을 것: A3 의 `ProviderCredential`, 구글 GIS(https://developers.google.com/identity/gsi/web/guides/overview), Apple JS(`appleid.auth.js`, 팝업 방식), 카카오 인가 코드 요청(REST)
- 할 것: `src/features/auth/providers/google.web.ts`(GIS 스크립트를 한 번 싣고 버튼 · 콜백의 `credential` → `{ GOOGLE, idToken }`), `apple.web.ts`(팝업 → `{ APPLE, idToken, authorizationCode }`), `kakao.web.ts`(`https://kauth.kakao.com/oauth/authorize?...&scope=openid` 로 이동, 돌아올 주소 `<웹 주소>/auth/kakao`), 라우트 `src/app/auth/kakao.tsx`(`code` 를 읽어 `signIn({ KAKAO, code, redirectUri })`). 각 파일은 `isAvailable(): boolean` 과 `getCredential(): Promise<ProviderCredential | null>`(취소면 null)을 낸다.
- 주는 것: 웹용 `isAvailable` · `getCredential` 세 쌍, `/auth/kakao` 라우트
- 하지 말 것: 공급자 SDK 를 npm 으로 들이기. 이유: 셋 다 공식 스크립트나 주소 이동으로 된다.
- 검증: 테스트 먼저 — 카카오 이동 주소의 쿼리, `/auth/kakao` 가 `code` 없으면 로그인 화면으로, 취소 시 null. `npm test -- providers` 통과
- 실행 패턴: 혼자
- 결과 요약:

### A6. native-provider-credentials · 상태: 대기 (A2 필요)
- 읽을 것: A2 결과, A5 의 함수 모양, 라이브러리 문서(A2 와 같음)
- 할 것: `google.native.ts`(`webClientId` 로 `idToken`), `apple.ios.ts`(`expo-apple-authentication` → `identityToken` · `authorizationCode`), `apple.android.ts`(`isAvailable() = false`), `kakao.native.ts`(네이티브 SDK → `idToken`). A5 와 같은 함수 모양.
- 주는 것: 플랫폼별 같은 이름의 `isAvailable` · `getCredential`
- 하지 말 것: 받은 이름 · 이메일 저장. 이유: 계정에는 식별자만 둔다.
- 검증: 테스트(라이브러리 흉내) — 취소 시 null, 토큰 없음 시 null. `npm test -- providers` · `npx tsc --noEmit` 통과
- 실행 패턴: 혼자
- 결과 요약:

### A7. login-signup-screens-and-guard · 상태: 대기
- 읽을 것: A4 · A5 · A6 결과, `src/app/_layout.tsx`, `src/app/index.tsx`(출생 정보가 없으면 `BirthForm` 을 보여 주는 홈) · `src/app/birth.tsx`(고치기 화면 — `BirthForm` 에 `save` 를 넘기는 모양), `src/features/chart/birth-form.tsx`, `src/app/settings/index.tsx`, `src/features/auth/account-delete-sheet.tsx`, DESIGN.md, Expo Router 보호 라우트 문서(v58)
- 할 것: `src/app/login.tsx`(쓸 수 있는 공급자 버튼만, 문구 `strings.login.*`). `src/app/signup.tsx` — `BirthForm` 에 `completeSignup` 을 부르는 `save` 를 넘긴다(성공하면 기기에도 출생 정보를 둔다 — `useBirthProfile` 의 저장과 같은 결과). `UNDER_AGE` 면 "만 14세 이상만 가입할 수 있어요" 를 보여 주고 로그인 화면으로. 가드: `signedOut` 이면 `/login` · `/auth/*` · `/s/*` 말고는 `/login` 으로, `signingUp` 이면 `/signup` 으로. 설정에 로그아웃 줄. 계정 삭제 뒤 `/login`.
- 주는 것: 가입 흐름 전체
- 하지 말 것: 로그인 화면 디자인을 새로 짓기. 이유: 디자이너가 만든다 — 지금 토큰 · 부품으로 단순하게.
- 검증: 테스트 먼저 — 로그인 전 `/chart` → `/login`, `/s/x` 는 그대로, 가입 중 → `/signup`, 만 14세 미만이면 홈에 못 감, 로그아웃 → `/login`. `npx tsc --noEmit && npx expo lint && npm test && npx expo export --platform web` 통과
- 실행 패턴: 혼자
- 결과 요약:

### A8. real-round · 상태: 대기 (사용자 준비 2~5 필요)
- 읽을 것: 이 파일 "검증"
- 할 것: 로컬 서버 + 웹(8081, `EXPO_PUBLIC_DEV_SESSION` 끔)으로 구글 · 카카오 로그인 → 새 계정 가입 → 새로고침해도 로그인 유지 → 로그아웃 → 계정 삭제(카카오 연결 끊김 확인). EAS 개발 빌드로 iOS(애플 · 구글 · 카카오) · Android(구글 · 카카오) 한 바퀴. 스크린샷을 실행 기록에.
- 주는 것: 실제 확인 기록
- 하지 말 것: 실제 사람의 출생 정보로 시험. 이유: 개인정보다 — 가짜 날짜를 쓴다.
- 검증: 위 흐름의 스크린샷과 서버 로그(토큰 · 출생 정보 없음)
- 실행 패턴: 혼자(소유자와 함께)
- 결과 요약:

## 검증
- 서버: `./gradlew build` → exit 0(Docker 필요, `/verify` 표 1 · 2).
- 앱: `npx tsc --noEmit && npx expo lint && npm test && npx expo export --platform web` → 모두 통과(`/verify`).
- 실제: A8 의 웹 · iOS · Android 흐름. 애플 웹은 테스트 서버가 뜬 뒤(범위 밖 차단).

## 리뷰 초점
1. 서버 시간대가 UTC 일 때 한국 시간 0~9시의 14번째 생일 — S6 테스트에 시각을 고정해 넣는다.
2. 같은 사람이 가입권 두 장으로 동시에 가입 — 계정 1개, 출생 정보 1개(S6, `findOrCreate` 의 unique).
3. 쿠키 인증 요청에 `Origin` 이 없거나 `null` 일 때(S3).
4. 같은 카카오 인가 코드를 두 번 보내거나 다른 `redirectUri` 로 보낼 때(S5).
5. 웹에서 로그인 직후 다른 탭이 이미 열려 있을 때 그 탭의 세션 상태(A4 — `getSession()` 을 화면이 다시 보일 때 부를지 결정을 실행 기록에).

## 자동 반복
- 사람 없이 끝까지 돌리지 않는다. A2 · A8 과 Apple · Kakao 실제 호출은 소유자 준비가 있어야 한다.
- 테스트가 기준인 S2~S8 · A3~A7 은 태스크 안에서 "기준 충족까지 반복, 상한 3회". 세 번 미달이면 멈추고 보고.

## 위험 · 되돌리기
- `@react-native-google-signin` 무료판의 안드로이드는 폐기 예정 방식(legacy) 위에 있다. 막히면 `react-native-nitro-google-signin`(Expo 문서가 같이 권함)으로 바꾼다.
- 카카오 RN 라이브러리가 SDK 58 · 새 아키텍처에서 안 될 수 있다(A2 에서 먼저 확인). 안 되면 앱도 웹 방식(인가 코드)으로 — 서버는 이미 받는다.
- 쿠키 방식은 웹 앱과 서버가 같은 도메인 아래(예: `<도메인>` 과 `api.<도메인>`)여야 한다. 호스팅을 고를 때의 제약이다.
- 애플 refresh token 을 DB 에 둔다. 새면 그 사람의 애플 연동을 끊을 수 있는 정도다.
- 되돌리기: 두 저장소 모두 `feat/social-login` 브랜치 단위. 마이그레이션은 추가만이라 이전 코드가 새 DB 에서도 돈다.

## 실행 기록

### S1 (2026-11-18, 서버 브랜치 `feat/social-login`, 워크트리 `../.wt-api-login`)
- 결정: 번들 ID · 안드로이드 패키지 `com.byeolmyeong.app` — 소유자가 산 도메인 `byeolmyeong.com` 을 거꾸로 — 틀리면 비용: 스토어 등록 전이면 `app.json` 두 줄, 뒤면 새 앱.
- 결정: 웹 앱과 서버를 같은 도메인 아래에 둔다(예: 웹 `byeolmyeong.com`, 서버 `api.byeolmyeong.com`) — 쿠키 `SameSite=Lax` 가 가려면 같은 사이트여야 한다 — 틀리면 비용: 호스팅 주소 다시 잡기.
- 결정: 결정 020 의 "공급자 값" 표(iss · JWKS)는 S4 가 공식 문서로 채운다 — 이번 조사에서 애플 문서 본문이 안 읽혔다 — 틀리면 비용: 없음(S4 의 할 일).
- 검증 `grep -c "auth/signup\|bm_session" docs/architecture.md`:
```
5
```

### S2 (2026-11-18, 서버 `046671e`)
- 결정: 만료 판정은 DB 의 `now()` 로 한다(`make_interval(days => ?)`) — 서버에 `Clock` 빈이 없고 테스트가 DB 시각을 옮겨 시험한다 — 틀리면 비용: 쿼리 한 줄.
- 결정: 로그아웃이 지울 세션은 세션 검사가 요청에 붙여 둔 토큰(`CurrentOwner.sessionToken()`)으로 찾는다 — 헤더를 컨트롤러에서 다시 읽으면 S3 의 쿠키 경로와 두 곳이 된다 — 틀리면 비용: 없음.
- 참고: 운영 기본값에서 `/auth/dev` 404 테스트는 이미 있다(`DevAuthOffByDefaultIntegrationTest`). S6 에서 새로 만들지 않는다.
- 빨강: `./gradlew test --tests '*SessionExpiry*'` → `5 tests … 4 failed`(세션 없는 401 은 원래 통과).
- 초록: `./gradlew build` → `BUILD SUCCESSFUL in 2m 32s`, 테스트 419개 실패 0.

### S3 (2026-11-18, 서버 `561b0ba`)
- 결정: 쿠키 Max-Age 는 400일(브라우저가 허용하는 최대)로 두고 실제 만료는 서버의 90일 판정에 맡긴다 — 쿠키를 90일로 박으면 매일 쓰는 사람도 90일째에 풀린다 — 틀리면 비용: 상수 하나.
- 결정: Origin 검사는 세션 확인(DB)보다 먼저 한다 — 막을 요청에 DB 를 쓰지 않는다 — 틀리면 비용: 없음.
- 참고: 허용하지 않은 Origin 은 Spring 의 CORS 처리가 세션 검사 전에 403 으로 막는다(기존 동작). 새 검사가 실제로 막는 것은 Origin 이 없거나 `null` 인 쿠키 요청과, 허용 주소가 비어 CORS 설정이 없는 서버다.
- 빨강: `./gradlew test --tests '*Cookie*'` → `19 tests completed, 7 failed`.
- 초록: `./gradlew build` → `BUILD SUCCESSFUL in 2m 10s`, 테스트 428개 실패 0.

### S4 (2026-11-18, 서버 `f47f8c6` · 번호 바꾸기 `e9bfe1c` · 공급자 값 `dbef616`)
- 확인: 세 공급자의 `/.well-known/openid-configuration` — 구글 `https://accounts.google.com` · `https://www.googleapis.com/oauth2/v3/certs`, 애플 `https://appleid.apple.com` · `https://appleid.apple.com/auth/keys`, 카카오 `https://kauth.kakao.com` · `https://kauth.kakao.com/.well-known/jwks.json`, 셋 다 RS256.
- 결정: `nimbus-jose-jwt` 는 Spring Boot 가 버전을 관리하지 않아 10.10(Maven Central 최신, 2026-09-17)으로 정한다 — 틀리면 비용: 한 줄.
- 결정: 검증기 구현은 클래스 하나(`JwksTokenVerifier`, 파일 안에서만 보임)를 공급자 셋으로 만들고, 키 출처를 빈(`googleKeys` · `appleKeys` · `kakaoKeys`)으로 따로 둔다 — 테스트(S6)가 메모리 키로 바꿔 끼울 수 있게 — 틀리면 비용: 없음.
- 결정: 인터페이스 `ProviderTokenVerifier` 는 둔다. ArchUnit 의 외부 호출 목록에는 nimbus 가 없어 규칙이 강제하지 않지만, architecture "의존 규칙" 이 "소셜 로그인 같은 외부 호출은 인터페이스 하나 뒤" 라고 적었다 — 틀리면 비용: 없음.
- 결정: 서버 결정 번호를 020 → 021 로 바꿨다 — 같은 날 다른 작업(브랜치 `chore/deploy-oracle`, 호스팅: 오라클 VM + 버셀)이 020 을 먼저 썼다. 이미 만든 커밋 `c6fb66b` · `046671e` · `561b0ba` 의 메시지에는 "020" 이 남아 있다(이력은 고쳐 쓰지 않는다) — 틀리면 비용: 없음.
- 참고: 호스팅 결정 020 의 주소(앱 `byeolmyeong.com` · 서버 `api.byeolmyeong.com`, 스테이징 `staging.` · `api-staging.`)는 쿠키의 같은 사이트 조건을 채운다. 그 결정은 "배포 전 안전장치" 계획(`docs/plans/2026-11-18-pre-deploy-hardening.md`, 아직 없음)을 따로 만든다고 했다 — 세션 만료 · 로그아웃(배포 전 확인 3번)은 이 브랜치의 S2 가 이미 했다. 겹치지 않게 소유자에게 알린다.
- 빨강: 자리표시(`TODO()`)로 `./gradlew test --tests '*ProviderTokenVerifier*'` → `18 tests completed, 8 failed`.
- 초록: `./gradlew build` → `BUILD SUCCESSFUL in 2m 44s`, 테스트 436개 실패 0.

### S5 (2026-11-18, 서버 `0a4f69a`)
- 결정: 외부 호출 규칙(ArchUnit: `org.springframework.web.client` 를 쓰는 클래스는 프로젝트 인터페이스를 구현)에 맞춰 인터페이스 `KakaoOAuth` + 구현 `KakaoOAuthClient` 로 나눴다. 계획의 `KakaoOAuthClient.exchange` 는 `KakaoOAuth.exchange` 로 부른다 — 틀리면 비용: 없음.
- 결정: 테스트는 `MockRestServiceServer` 대신 JDK `HttpServer` 가짜 + 설정 `byeolmyeong.auth.kakao.auth-url` 로 했다 — `ClaudeTextGeneratorTest` 와 같은 방식이고, 실제 클라이언트(타임아웃 포함)를 그대로 시험한다 — 틀리면 비용: 없음.
- 결정: 카카오 응답에 ID 토큰이 없으면 502 `PROVIDER_UNAVAILABLE` + 로그 `event=kakao_no_id_token` — 콘솔에서 OpenID Connect 를 안 켠 설정 문제라 사용자 잘못(401)이 아니다 — 틀리면 비용: 상태 코드 하나.
- 결정: 연결 타임아웃 3초 · 읽기 5초 — 기획에 없음 — 틀리면 비용: 상수 둘.
- 빨강: 자리표시로 `./gradlew test --tests '*KakaoOAuthClient*'` → `16 tests completed, 6 failed`.
- 초록: `./gradlew build` → `BUILD SUCCESSFUL in 2m 26s`, 테스트 442개 실패 0.

### S6 (2026-11-18, 서버 `37f44b7`)
- 결정: 로그인 · 가입은 `AuthService` 에 더하지 않고 새 `LoginService` 에 뒀다 — `AuthService` 는 세션 검사가 매 요청 쓰는 곳이라 의존(공급자 · 카카오 · 출생 정보 · 트랜잭션)을 늘리지 않는다. `AuthService` 는 `issueSession` · `newToken` · `hash` 를 연다 — 틀리면 비용: 없음.
- 결정: 가입의 순서는 가입권 확인(401) → 출생 정보 검증(400, 가입권 남김) → 만 14세(403, 가입권 지움) → 트랜잭션(가입권을 `delete … returning` 으로 써서 동시 사용을 한 번만) — 만 14세 미만의 403 을 트랜잭션 밖에서 내야 가입권 삭제가 되돌려지지 않는다 — 틀리면 비용: 없음.
- 결정: 만 14세 판정의 "오늘" 은 `koreaToday(Instant.now())` 로 한국 날짜를 쓴다. `Clock` 빈은 만들지 않았다 — 시간대 경계는 순수 함수 테스트(`AgeTest`, 리뷰 초점 1)로 본다 — 틀리면 비용: 통합 테스트에서 시각을 고정하려면 `Clock` 빈이 필요하다.
- 결정: 감사 기록은 이미 있는 `USER_LOGIN` 과 `PROFILE_SAVED`(`CREATED`)로 남긴다. 새 종류(가입)는 만들지 않았다 — 관리 화면의 목록을 바꾸지 않는다 — 틀리면 비용: enum 한 줄 + 관리 화면.
- 결정: 만료된 가입권은 새 가입권을 넣을 때 함께 지운다 — 따로 도는 일꾼을 두지 않는다 — 틀리면 비용: 로그인이 없으면 만료 행이 남는다(공급자 식별자뿐).
- 리뷰 초점 1(한국 0~9시의 생일): `AgeTest` 의 `koreaToday(2026-11-18T15:30Z) = 11-19`. 리뷰 초점 2(가입권 두 장 동시 가입): 통합 테스트 — 둘 다 201, 계정 1 · 출생 정보 1.
- 테스트 키는 `@TestBean`(키 출처 빈 `googleKeys` · `kakaoKeys`, `KakaoOAuth`)으로 바꿔 끼웠다.
- 빨강: 자리표시로 `./gradlew test --tests '*AgeTest*' --tests '*SocialLogin*'` → `27 tests completed, 17 failed`.
- 초록: `./gradlew build` → `BUILD SUCCESSFUL in 2m 30s`, 테스트 459개 실패 0.

### S7 (2026-11-18, 서버 `a2bec88`)
- 확인(애플 문서 데이터 `developer.apple.com/tutorials/data/documentation/…json` — 화면 페이지는 안 읽혀 같은 문서의 데이터를 읽었다): 철회는 `client_id`(그 로그인의 App ID 또는 Services ID) · `client_secret` · `token` · `token_type_hint`, 이미 무효인 토큰도 200. authorization code 는 1회용 · 5분. `redirect_uri` 는 처음 요청에 있었을 때만 보내고 localhost · IP 를 받지 않는다. 서버 알림 본문은 JSON `{ "payload": "<JWT>" }`, 클레임은 `iss` · `aud` · `iat` · `jti` · `events`(`type` · `sub` · `event_time`) — sub · exp 가 위에 없다. 종류 이름은 `account-deleted`.
- 결정: 계약의 알림 본문을 폼(`payload=`)에서 JSON `{ payload }` 로 고쳤다 — S1 때 확인 없이 적었다 — 틀리면 비용: 없음(애플 문서와 맞춤).
- 결정: `account-delete` 와 `account-deleted` 를 둘 다 받고, `events` 는 객체 · JSON 글자 둘 다 읽는다 — 자료마다 다르다(포럼 · 블로그 보고) — 틀리면 비용: 없음.
- 결정: `ProviderIdentity` 에 `audience`(토큰을 받은 우리 클라이언트 ID)를 더했다 — 애플 교환 · 철회는 그 로그인의 클라이언트(번들 ID / Services ID)로 해야 한다 — 틀리면 비용: 없음.
- 결정: 애플 웹은 `authorizationCode` 와 함께 그 로그인의 `redirectUri` 를 보낸다(허용 목록 없음) — 코드는 애플에서 클라이언트 · 돌아올 주소에 묶여 있어 틀린 값이면 교환만 실패한다 — 틀리면 비용: 계약 한 줄.
- 결정: 만 14세 미만으로 가입을 거절할 때 가입권에 있던 애플 토큰도 철회한다(계획에 없음) — 계정을 만들지 않으니 애플 쪽 연결도 남기지 않는다 — 틀리면 비용: 없음.
- 결정: `account-deleted` 알림에는 철회를 부르지 않는다 — 애플 계정이 이미 없다 — 틀리면 비용: 없음.
- 결정: 애플 키를 받지 못한 알림은 502(애플이 다시 보낸다), 서명 · 대상 · 모양이 틀리면 400 `INVALID_NOTIFICATION`.
- 결정: 키(`APPLE_*`)가 없거나 .p8 이 틀리면 애플을 부르지 않고 로그(`apple_not_configured` · `apple_private_key_invalid`)만 — 로그인은 된다. 환경 변수에 한 줄로 넣은 .p8 의 `\n` 글자도 읽는다.
- 빨강: `AppleSignInClientTest` 자리표시 → `17 tests completed, 7 failed`, `AppleAccountIntegrationTest` → `19 tests completed, 9 failed`.
- 초록: `./gradlew build` → `BUILD SUCCESSFUL in 2m 18s`, 테스트 475개 실패 0.

### S8 (2026-11-18, 서버 `d60bd14`)
- 결정: 연결 끊기는 `KakaoOAuth` 인터페이스에 `unlink(userId): Boolean` 으로 더했다(같은 카카오 경계) — 틀리면 비용: 없음.
- 결정: 어드민 키가 없으면 카카오를 부르지 않고 `event=kakao_unlink_failed reason=NoAdminKey` 로그 — 계정은 지운다 — 틀리면 비용: 없음.
- 빨강: `./gradlew test --tests '*KakaoOAuthClient*' --tests '*SocialLogin*'` → `34 tests completed, 3 failed`.
- 초록: `./gradlew build` → `BUILD SUCCESSFUL in 2m 16s`, 테스트 479개 실패 0.

### A1 (2026-11-18, 앱 브랜치 `feat/social-login`, 워크트리 `../.wt-app-login`, `c80dcbe`)
- 결정: release F7 의 "웹·iOS·Android 모두에서 셋 다" 를 "Android 는 구글·카카오" 로 고쳤다 — 계획의 "내 결정"(안드로이드 애플 없음)을 소유자가 승인했다 — 틀리면 비용: 안드로이드 애플(서버 리디렉트 경로 + 앱 웹 방식).
- 결정: 계획 파일을 따로 먼저 커밋했다(`e1e7265`, `docs(plans)`) — 계획과 결정 문서를 한 커밋에 섞지 않는다.
- 검증 `grep -n "httpOnly" CLAUDE.md docs/decisions/034-*.md` → CLAUDE.md:45, 034:8 · 034:27.

### A2 (2026-11-18, 앱 `52a21c5`)
- 확인: npm 레지스트리 — `@react-native-seoul/kakao-login` 6.0.4(2026-08, README 에 Expo 설정: 플러그인 `kakaoAppKey` + `expo-build-properties` 의 카카오 Maven 저장소, 개발 빌드만, `login()` 결과에 `idToken`), `@react-native-google-signin/google-signin` 17.0.0(2026-10, peer `expo >=52.0.40`), `expo-apple-authentication` 58.0.3. 대안 `@react-native-kakao/*` 3.2.0 도 살아 있다 — 계획대로 seoul 판을 쓴다.
- 결정: 노드는 `.nvmrc` 의 22 를 쓴다(셸 기본은 20 이라 `~/.nvm/versions/node/v22.21.1/bin` 을 앞에 둔다).
- 결정: `expo-dev-client` 를 더 들였다(계획에 없음) — `eas.json` 의 개발 빌드 프로필(`developmentClient`)에 필요하다 — 틀리면 비용: 패키지 하나.
- 결정: `npx expo install` 이 `app.json` 에 넣은 플러그인 셋(구글 · 카카오 · build-properties, 옵션 없음)을 빼고 `app.config.ts` 에서 값이 있을 때만 넣는다 — 구글 플러그인은 `iosUrlScheme` 없이 설정 읽기에서 예외, 카카오는 `kakaoundefined` 스킴을 만든다 — 틀리면 비용: 값 없는 빌드에서 그 공급자 로그인 불가(의도).
- 결정: `eas.json` 에 `development-simulator`(iOS 시뮬레이터) 프로필도 뒀다 — 등록한 아이폰이 없어도 확인할 수 있게 — 틀리면 비용: 없음.
- 결정: CLAUDE.md 명령어에 기기 개발 빌드 한 줄(51줄).
- 검증 `npx expo config --type public`: 값 없이 → `com.byeolmyeong.app com.byeolmyeong.app True`, 플러그인 `[… 'expo-apple-authentication']`. 가짜 값과 함께 → 구글 `iosUrlScheme: com.googleusercontent.apps.123-abc` · 카카오 `kakaoAppKey` · build-properties 카카오 저장소.
- 검증 `npx tsc --noEmit` exit 0, `npx expo lint` exit 0, `npx expo export --platform web` 성공.
- 미달(기존): `npx expo-doctor@1.21.6` → `1 check failed` — "packages match versions required by installed Expo SDK" 의 패치 버전 12개(`expo` 58.0.23→58.0.26, `expo-router`, `expo-web-browser` 58.0.7→58.1.0, `jest-expo` 등). 모두 이번에 들인 것이 아니다. 따로 올릴지 소유자에게 묻는다(계획의 "문제 0" 은 이것 말고 충족).
- 주의: 첫 `npm test` 에서 5개 실패(스위트 4) → 같은 코드로 두 번 더 돌려 712개 모두 통과. 원인 미확인 — 같은 시각 서버 리뷰어가 Gradle 을 돌리던 부하로 인한 타임아웃으로 추정한다.

### A3 (2026-11-18, 앱 `9f22291`)
- 결정: 웹 판정은 `createApi` 의 `cookieSession` 설정 하나로 하고 앱 인스턴스가 `Platform.OS === 'web'` 를 넣는다 — 테스트가 플랫폼을 흉내 내지 않고 설정으로 시험한다 — 틀리면 비용: 없음.
- 결정: 웹에서는 서버가 토큰을 본문에 넣어 보내도 버린다(`token: null`) — "앱 코드가 웹에서 토큰을 만지지 않는다"(결정 034) — 틀리면 비용: 없음.
- 결정: 401 응답도 오류 이름(`code`)을 읽는다 — 로그인 · 가입은 `INVALID_ID_TOKEN` · `INVALID_CODE` · `SIGNUP_EXPIRED` 로 갈린다. 기존 401 결과의 모양은 본문이 없으면 그대로다 — 틀리면 비용: 없음.
- 결정: `DevSession.token` 을 `string | null` 로 바꾸며 `session-store.ts` 의 저장 한 줄을 `r.data.token` 이 있을 때만으로 고쳤다(타입 맞춤, 상태 설계는 A4) · 기존 테스트 한 줄(`token?.length`)도 타입만 맞췄다(단언은 그대로).
- 빨강: `npx jest src/lib/__tests__/api-auth.test.ts` → `Tests: 11 failed, 11 total`.
- 초록: `npx tsc --noEmit` 0 · `npx expo lint` 0 · `npm test` → `Tests: 723 passed, 723 total`.

### A4 (2026-11-18, 앱 `2dd073c`)
- 결정: `Session` 에 `ready` · `token` 을 남기고 `status` · `lastError` 를 더했다 — 화면 열한 곳이 `ready` 를 쓴다. 계획의 모양(`{ status, token }`)보다 넓다 — 틀리면 비용: 없음.
- 결정: 로그인 여부를 `token !== null` 로 보던 두 곳(`src/app/index.tsx` 되살리기, `src/features/chart/birth-form.tsx` 서버 저장)을 `status === 'signedIn'` 으로 바꿨다 — 웹은 쿠키 세션이라 토큰이 언제나 null 이다 — 틀리면 비용: 웹에서 출생 정보가 서버에 저장되지 않는다(이 수정이 없으면).
- 결정: 앱이 켤 때 서버에 닿지 못하면(네트워크 · 서버 오류) 보관된 토큰을 믿고 로그인 상태로 둔다. 웹은 확인에 실패하면 로그인 전으로 둔다 — 앱은 기기에 토큰이 있어 다음 401 에서 바로잡히고, 웹은 믿을 것이 없다 — 틀리면 비용: 한 줄.
- 결정: 소셜 로그인 중 401 은 다시 받지 않고 로그인 전이 된다(`refresh` 가 false). 개발용은 지금처럼 새로 받는다.
- 결정: 계정을 지운 뒤(`clear`)에는 개발용이어도 로그인 전이 된다(전에는 토큰 없이 두었다가 다음 401 에 새로 받았다). 개발용 빌드의 로그인 화면에서 다시 들어가는 길은 A7 이 정한다.
- 결정: 리뷰 초점 5(웹에서 다른 탭이 열려 있을 때)는 이번에 화면이 다시 보일 때 `getSession()` 을 부르지 않는다 — 다른 탭은 다음 요청의 401 로 로그인 전이 된다 — 틀리면 비용: 앞으로 돌아올 때 확인 한 번(AppState/visibility).
- 일괄 변경: 화면 테스트 16개 파일의 세션 흉내 45곳을 새 모양으로 옮겼다(토큰 있음 → `signedIn`, null+준비 → `signedOut`, 준비 전 → `checking`). 처음 쓴 정규식이 줄을 넘겨 `restore-birth.test.tsx` 의 타입 표기를 삼켜 되돌리고 줄을 넘지 않는 식으로 다시 했다.
- 빨강: `npx jest src/features/auth` → `Tests: 23 failed, 6 passed, 29 total`.
- 초록: `npx tsc --noEmit` 0 · `npx expo lint` 0 · `npm test` → `Tests: 734 passed, 734 total`.

### 서버 독립 리뷰(2026-11-18, S1~S8 뒤 · `reviewer` 지시로 깨끗한 컨텍스트)
- 결과: 차단 0 · 수정 3 · 제안 13. 리뷰어가 `./gradlew build --rerun-tasks` 479개 통과를 다시 확인하고, 실제 구글 JWKS · 빌드한 jar · 임시 Postgres 로 시험했다.
- 처리(서버 `fe1ed6b` · `668e4e8` · `19dfdf1` · `360f2f6`, 각 수정은 실패하는 테스트를 먼저 보고 고쳤다 — 빨강 `99 tests completed, 13 failed`):
  - 1 수정 · 고침: 모르는 kid 로 키 다시 받기 한도(`RateLimitReachedException`)에 걸린 토큰이 502 였다 → 401(알림은 400). 키 받기 타임아웃 0.5초 → 연결 2초 · 읽기 3초.
  - 2 수정 · 고침: `.env` 는 여러 줄 값을 못 읽는데 `.env.example` 이 .p8 을 "줄바꿈 포함" 이라 안내 → 한 줄 `\n` 으로 안내, 값이 있는데 못 읽으면 `apple_private_key_invalid reason=Empty`, 설정이 없어 철회 못 함은 `apple_revoke_failed reason=NotConfigured`.
  - 3 수정 · 고침: 결정 021 이 "배포 전 확인 2 · 3 이 풀린다" 고 잘못 적었다 → 3 만 해결, 2(개발용 로그인 기동 안전장치)는 아직(호스팅 결정 020 의 배포 전 안전장치 계획). 계획에도 적었다.
  - 4 고침(문서): `SESSION_COOKIE_SECURE=` 빈 값이면 서버가 안 뜬다 — 안내만 고쳤다(기존 `AUTH_DEV_ENABLED=` 와 같은 방식).
  - 5 고침: 늦게 되풀이된 `consent-revoked` 가 새 세션까지 지웠다 → `event_time` 보다 먼저 생긴 세션만.
  - 6 고침: `/auth/login` · `/auth/signup` 주소별 분당 30(`auth-per-minute`). 주의: 주소는 `remoteAddr` 라 Caddy 뒤에서는 전달 헤더 설정이 없으면 모든 요청이 한 주소다(기존 제한들도 같다) — 배포 작업에 알린다.
  - 7 고침: 대상이 여럿이면 `azp` 가 우리여야 한다.
  - 8 고침: 남은 가입권으로 다시 가입하면 기존 출생 정보를 덮고 감사 `CREATED` 를 또 남겼다 → 계정이 있으면 세션만.
  - 9 미룸: 만료 가입권의 애플 토큰을 철회하지 않고 버린다 · 다음 가입권을 넣을 때만 치운다 — 정리 일꾼이 필요하다. 결정: 미룬다 — 가입권의 수명이 30분이고 담긴 것은 공급자 식별자 · 애플 토큰뿐 — 틀리면 비용: 가입을 그만둔 애플 사용자의 앱 연결이 애플 쪽에 남는다.
  - 10 미룸(불확실): 쿠키 이름 `__Host-` 접두사(형제 서브도메인 XSS 로 쿠키 심기) — 접두사는 Secure 가 필수라 로컬 http 와 이름이 갈린다. 결정: 미룬다 — 공격은 같은 도메인의 다른 화면 XSS 가 전제 — 틀리면 비용: 쿠키 이름 바꾸기(계약 · 앱은 이름을 모른다).
  - 11 · 12 · 13 · 14 고침: 계정 삭제가 쿠키도 지운다 · 공급자 정리의 예상 밖 예외에도 계정 삭제 · 애플 계정 삭제 알림의 감사 행위자 SYSTEM · 점검 중에도 애플 알림.
  - 15 고침: Origin 검사 GET · HEAD 문서, 알림 본문이 JSON 아니면 400 `INVALID_REQUEST` 문서, 카카오 400 만 `INVALID_CODE`(401 · 403 은 502), 키 타임아웃.
  - 16 받아들임: 결정 021 에 결정이 여럿 묶였다 — 이미 활성이라 다음 결정부터 나눈다.
- 리뷰가 "보지 못한 것" 으로 남긴 것 중 소유자에게 물을 것: 가입 뒤 설정에서 생년월일을 만 14세 미만으로 고쳐도 막지 않는다(`PUT /profile`) · 연결 끊기 · 철회 실패 로그에 다시 처리할 식별자가 없다(토큰 · 계정 식별자를 로그에 남기지 않는 규칙 때문).
- 관찰: `AdminAppConfigApiIntegrationTest` 의 한 단언(`updatedAt.isAfter(before)`)이 한 번 실패 → 혼자 두 번 통과. JVM 시계와 DB 컨테이너 시계를 견주는 기존 테스트라 흔들린다(이번 변경과 무관). 손대지 않았다.
- 초록: `./gradlew build` → `BUILD SUCCESSFUL in 2m 48s`, 테스트 489개 실패 0.

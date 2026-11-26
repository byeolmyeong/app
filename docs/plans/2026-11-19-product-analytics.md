---
type: plan
status: approved
tags: [제품 분석, 앰플리튜드, 파이어베이스, GA4]
last_reviewed: 2026-11-26
---
# 제품 분석 — 앰플리튜드 + 파이어베이스 애널리틱스(GA4), 1.0.0

> 상태: 승인(2026-11-19, 소유자 "승인") · 기준 2026-11-19 · 2026-11-26 결정 081 로 바뀜(앰플리튜드만 · 운영 프로젝트 하나 · 분석용 id 는 `GET /auth/analytics-id` · 태스크 4·5 는 1.1.0) · 서버 저장소 태스크 하나(분석용 id, 태스크 2) 포함

## 목표
- 무엇을: iOS·안드로이드·웹에 앰플리튜드와 파이어베이스 애널리틱스(GA4)를 넣고, 성공 지표(docs/product.md "성공 지표")에 맞춘 이벤트 11개를 두 곳에 같이 보낸다.
- 누구를 위해: 출시 후 4주 동안 지표를 보는 소유자.
- 끝나면: 앰플리튜드에서 가입 → 차트 → 요약 해석 → 공유 퍼널과 리텐션을 보고, GA4 에서 유입 경로를 본다. 출생 정보·공유/초대 식별자·인증 코드는 어느 쪽에도 가지 않는다.

## 결정된 전제
- docs/product.md "성공 지표" — 무엇을 잴지의 단일 출처
- 결정 001(Expo 한 코드베이스) · 034(소셜 로그인, 개발 빌드) · 037(웹은 Vercel, 스테이징·운영)
- docs/golden-rules.md 프로젝트 규칙: 출생 정보를 로그·공유 페이지·분석 이벤트에 남기지 않는다
- 서버 결정 021(세션)
- docs/release-1.0.0.md "사용자만 할 수 있는 준비": 파이어베이스 프로젝트(푸시와 같이 쓴다)

## 인터뷰 결과
| 질문 | 답 | 영향 |
|---|---|---|
| 도구 | 앰플리튜드 + 파이어베이스(GA4) 둘 다 1.0.0 (소유자: "파이어베이스 지금 1.0.0에 넣을건데 같이 넣자") | 이벤트 하나를 두 곳에 같이 보낸다. 역할: 앰플리튜드 = 퍼널·리텐션, GA4 = 유입·나중의 광고 |
| 사용자 식별 | 서버 계정 기반 | 서버가 분석용 id 를 내려준다(태스크 2). 가입 전은 기기 익명 id, 로그인 때 이어 붙인다 |
| 동의 | 처리방침에 적고 바로 수집 | 동의 창 없음. 처리방침·스토어 개인정보 항목 목록을 태스크 8 에서 만든다 |
| 웹 | 앱 + 웹 둘 다 | 웹도 같은 `track()`. 공유 링크 유입 지표는 웹에서만 잰다 |
| 환경 | 운영·스테이징 프로젝트 분리, 로컬은 안 보냄 | 앰플리튜드·파이어베이스 프로젝트 2개씩. 키가 비면 콘솔에만 찍는다 |

### 내 결정 (묻지 않고 고른 기본값)
- 분석용 id 는 계정 id 그대로가 아니라 계정 id 의 되돌릴 수 없는 해시다 — 외부 데이터와 DB 키가 바로 이어지지 않게. 같은 사람은 늘 같은 값.
- 속성 값은 정해진 값 목록(문자열 리터럴)·참거짓만 받는다. 자유 글자(이름·날짜·주소·글)를 받는 자리를 만들지 않는다 — 타입과 실행 중 확인 둘 다.
- 자동 화면·페이지 수집을 끄고 `screen_viewed` 를 직접 보낸다. 화면 이름은 경로 패턴(`/s/[shareId]`)이고 실제 주소·쿼리는 보내지 않는다 — 공유·초대 id 는 그 자체로 열쇠고, 카카오 웹 로그인 주소에는 인증 코드(`?code=`)가 있다.
- 광고 식별자(IDFA·AAID)와 IP 저장은 끈다 — 성공 지표에 필요 없고, 광고 식별자를 쓰면 iOS 추적 허용 창이 필요하다. 틀리면 비용: 지역별 숫자를 못 본다(켜면 그때부터 쌓인다).
- "공유했다"는 공유 시트를 연 것으로 센다(`share_started`) — 안드로이드는 실제로 올렸는지 알려 주지 않는다.
- 네이티브 파이어베이스 설정 파일(GoogleService-Info.plist · google-services.json)은 커밋하지 않고 EAS 파일 환경 변수로 넣는다 — 환경마다 파일이 다르다.
- 분석 SDK 의 오류는 앱을 멈추지 않는다(삼키고, 개발 중에는 콘솔에만).

## 이벤트 (11개 — 이 표가 단일 출처. 이름은 GA4 규칙: 소문자·밑줄·40자 이내)
| 이벤트 | 언제 | 속성(값 목록) | 쓰는 지표 |
|---|---|---|---|
| `app_opened` | 첫 화면이 보일 때, 실행마다 한 번 | `entry`: direct · share · invite | 가입 완료율의 분모 |
| `login_started` | 로그인 버튼을 누를 때 | `provider`: google · apple · kakao | 가입 퍼널 |
| `login_completed` | 기존 회원 로그인 성공 | `provider` | — |
| `signup_completed` | 가입 201 | `provider`, `time_known`: 참거짓 | 가입 완료율의 분자 |
| `birth_input_started` | 출생 정보 입력 첫 화면 | `context`: signup · profile_edit · synastry_direct | 차트 생성 완료율의 분모 |
| `chart_viewed` | 차트 화면이 그려졌을 때 | `time_known` | 차트 생성 완료율의 분자, 공유 유입 전환 |
| `reading_viewed` | 해석 글이 화면에 보일 때 | `kind`: summary(내 별명) · me_report(나 탭 풀이) · timing_report(시기 풀이) · day_sky(오늘의/그날의 하늘) · synastry · direction(1.1.0) | 가입자 중 요약 해석을 본 비율 |
| `reading_read_to_end` | 해석 글의 끝까지 스크롤했을 때(`/reading` · `/me` · `/timing/period` · `/today` · `/timing/day`) | `kind` | 끝까지 읽은 비율 |
| `share_started` | 공유 시트를 열 때 | `card`: nickname · me_area · day_sky · next_big(공유 v2, 결정 053) · synastry_score · ranking(1.1.0) | 공유 카드를 올린 비율 |
| `shared_link_opened` | 공유 링크 화면이 열릴 때(웹) | `card` | 공유 유입 전환의 분모 |
| `screen_viewed` | 화면이 바뀔 때 | `screen`: 경로 패턴(모르는 주소는 `(unknown)`) | 이탈 지점 |

## 범위 밖
- 광고·결제 이벤트(1.1.0, 결정 015).
- 계정 삭제 때 앰플리튜드·GA4 에 기록 삭제 요청(사용자 삭제 API) — "위험"에 적는다.
- 서버가 직접 보내는 이벤트. 가입·차트·해석 수는 서버 DB 숫자로 맞춰 본다.
- 푸시(app-1.0.0 태스크 9). 태스크 4 의 파이어베이스 앱 설정을 푸시가 다시 쓴다.
- 화면 녹화·히트맵·A/B 시험.

## 전역 제약
- 보내지 않는 것: 출생 정보(날짜·시각·곳) · 이름 · 해석 글 · 차트 값 · 공유 id · 초대 id · 인증 코드 · 이메일 · 소셜 계정 id. 어떤 이벤트·속성·사용자 속성에도.
- 환경 변수: `EXPO_PUBLIC_AMPLITUDE_API_KEY` · `EXPO_PUBLIC_FIREBASE_API_KEY` · `EXPO_PUBLIC_FIREBASE_PROJECT_ID` · `EXPO_PUBLIC_FIREBASE_APP_ID` · `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`(웹) · EAS 파일 환경 변수 `GOOGLE_SERVICES_JSON` · `GOOGLE_SERVICE_INFO_PLIST`(네이티브). 값이 비면 분석은 콘솔에만.
- SDK 는 Expo SDK 58 에 맞는 판으로 `npx expo install`. AGENTS.md 대로 Expo·각 SDK 공식 문서를 먼저 확인한다.
- 화면 코드는 SDK 를 직접 부르지 않는다. `src/lib/analytics/` 만 부른다.

## 태스크

### 1. adr-040-analytics · 상태: 완료
- 읽을 것: 이 계획의 "인터뷰 결과"·"내 결정"·"이벤트"·"전역 제약", docs/product.md "성공 지표", docs/decisions/037-web-deploy-vercel.md(형식)
- 할 것: `docs/decisions/040-product-analytics-amplitude-ga4.md` — 맥락(성공 지표를 잴 도구가 없다), 결정(두 도구와 역할, 보내지 않는 것, 식별, 환경 분리, 동의 방식), 대안(GA4 만 · 앰플리튜드만 · PostHog)과 버린 이유, 무료 한도(이 문서 한 곳에만 적는다). `docs/release-1.0.0.md` 에 요구 한 줄("제품 분석: 결정 040")과 "사용자만 할 수 있는 준비"에 아래 "사용자만 할 수 있는 준비" 항목.
- 주는 것: 결정 040.
- 하지 말 것: 처리방침 문안 쓰기. 이유: 소유자가 확정한다(태스크 8 은 항목 목록만).
- 검증: `ls docs/decisions/040-*` → 파일 하나, `git diff --stat` 에 release 문서.
- 실행 패턴: 혼자
- 결과 요약: `docs/decisions/040-product-analytics-amplitude-ga4.md`(무료 한도의 단일 출처 포함), release-1.0.0 에 F12·출시 기준·사용자 준비 두 줄.

### 2. server-analytics-id (서버 저장소 byeolmyeong-api) · 상태: 완료(결정 081 로 바뀜)
- 읽을 것: 서버 `docs/architecture.md` 계약 표의 `GET /auth/session`, `src/main/kotlin/com/byeolmyeong/api/auth/AuthController.kt`, 서버 결정 021, 앱 결정 040
- 할 것: `GET /auth/session` 을 204 → 200 `{ "analyticsId": string }` 로. `analyticsId` = SHA-256(`"byeolmyeong-analytics:" + ownerId`)의 16진수 앞 32자. 순수 함수 `analyticsIdOf(ownerId: UUID): String`. 계약 표를 같은 커밋에서 고친다.
- 불변식: 같은 계정 → 같은 값, 다른 계정 → 다른 값, 계정 id 는 응답에 나오지 않는다.
- 주는 것: 응답 `{ analyticsId }`.
- 하지 말 것: DB 컬럼 추가. 이유: 해시라 저장할 것이 없다.
- 검증: 빨강 → 초록. 통합 테스트(세션 있으면 200·32자 16진수·두 번 같은 값·다른 계정은 다른 값·세션 없으면 401) → `./gradlew build` 통과.
- 실행 패턴: 혼자(서버 세션, 서버 작업 브랜치에서)
- 배포 순서: 태스크 3 이 204·200 둘 다 받게 먼저 고친다. 지금은 운영 사용자가 없어 같이 합쳐도 된다.
- 결과 요약:

### 3. analytics-core · 상태: 완료
- 읽을 것: 이 계획의 "이벤트"·"전역 제약"·"내 결정", `src/lib/api.ts`(`GET /auth/session`), `src/features/auth/session-store.ts`, AGENTS.md, 앰플리튜드 React Native SDK 공식 문서
- 할 것: `src/lib/analytics/` — `initAnalytics(): void`, `track<E extends EventName>(event: E, props: EventProps[E]): void`, `identify(analyticsId: string): void`, `resetAnalytics(): void`, `screenNameOf(pathname: string): string`(경로 패턴으로 바꾸고 쿼리는 버린다). 이벤트·속성 타입은 "이벤트" 표 그대로. 실행 중에도 값 목록 밖의 값은 버리고 개발 중 경고. 키가 비면 콘솔에만. 이 태스크는 앰플리튜드까지 붙이고, 파이어베이스는 태스크 4·5 가 같은 자리에 붙인다. 앰플리튜드 SDK 가 웹을 지원하지 않으면 웹은 브라우저 SDK(`.web.ts`). 자동 수집(페이지 조회·폼·파일 내려받기)과 IP·광고 id 는 끈다. `api.ts` 의 `GET /auth/session` 검증이 204(빈 본문)·200(`{ analyticsId }`) 둘 다 받게.
- 주는 것: `initAnalytics` · `track` · `identify` · `resetAnalytics` · `screenNameOf`.
- 하지 말 것: 화면 코드에서 SDK 직접 부르기. 이유: 보내지 않는 것 규칙을 한 곳에서 지킨다.
- 검증: 테스트 먼저(빨강). `npm test -- analytics` — 값 목록 밖의 값은 버림, `screenNameOf('/s/abc?x=1')` = `/s/[shareId]`, `screenNameOf('/auth/kakao?code=zzz')` = `/auth/kakao`, 키가 비면 SDK 호출 0회, `GET /auth/session` 이 204·200 둘 다 통과.
- 실행 패턴: 혼자
- 결과 요약: `src/lib/analytics/`(events.ts 표 · screen.ts 경로 패턴 22개 · index.ts), 루트 레이아웃에서 `initAnalytics()`, `api.getSession()` → `SessionInfo { analyticsId }`(204·200). 파이어베이스는 태스크 4·5 가 index.ts 의 `track`·`identify`·`resetAnalytics` 안에 붙인다.

### 4. firebase-native · 상태: 1.1.0 으로 옮김(결정 081)
- 읽을 것: 태스크 3 결과, React Native Firebase 의 Expo 설치 공식 문서, `app.config.ts`, `eas.json`
- 할 것: `@react-native-firebase/app` · `@react-native-firebase/analytics` 와 config plugin(iOS 정적 프레임워크 설정 포함, 공식 문서대로). `app.config.ts` 가 `GOOGLE_SERVICES_JSON` · `GOOGLE_SERVICE_INFO_PLIST` 로 설정 파일을 고르고, 없으면 파이어베이스 플러그인을 빼서 로컬 개발이 깨지지 않게. `firebase.json`: 자동 화면 수집 끔, 광고 id 수집 끔, 기본 수집 끔(`initAnalytics` 가 키가 있을 때만 켠다). iOS 는 광고 id 없는 파이어베이스 판. 태스크 3 의 자리에 네이티브 파이어베이스를 붙인다.
- 주는 것: 네이티브 파이어베이스 앱 설정(푸시가 다시 쓴다).
- 하지 말 것: 설정 파일 커밋. 이유: 환경마다 다르고 EAS 파일 환경 변수로 넣는다.
- 검증: `npx expo prebuild --clean` 성공(생성물은 커밋하지 않는다), `npx expo config --type public` 의 설정 파일 경로가 환경 변수에 따라 바뀐다, 설정 파일이 없을 때 `npx expo start` 가 뜬다. 기기 개발 빌드에서 GA4 DebugView 에 `app_opened`(스크린샷).
- 실행 패턴: 혼자
- 차단 예상: 파이어베이스 프로젝트·설정 파일(소유자).
- 결과 요약:

### 5. firebase-web · 상태: 1.1.0 으로 옮김(결정 081)
- 읽을 것: 태스크 3 결과, Firebase JS SDK 애널리틱스 공식 문서
- 할 것: 웹은 `firebase/analytics`. 자동 `page_view` 를 끄고, 보내는 위치 값은 `screenNameOf` 로 만든 값만. 태스크 3 의 자리에 웹 파이어베이스를 붙인다.
- 하지 말 것: gtag 스크립트를 따로 넣기. 이유: 한 SDK 로 설정을 한 곳에 둔다.
- 검증: `npm test -- analytics` — 웹 초기화 설정에 자동 페이지 조회 끔, 위치 값에 쿼리·id 없음. 실제 요청은 태스크 9.
- 실행 패턴: 혼자
- 결과 요약:

### 6. track-events · 상태: 완료
- 읽을 것: 이 계획의 "이벤트" 표, 태스크 3 의 `track`·`screenNameOf`, 각 이벤트가 붙을 화면(로그인·가입·출생 정보 입력·차트·해석·공유·공유 링크 화면)
- 할 것: 표의 11개 이벤트를 해당 화면·동작에 단다. 이벤트마다 부르는 곳은 한 곳. `screen_viewed` 는 Expo Router 의 경로 변화에서 한 번.
- 하지 말 것: 표에 없는 이벤트·속성 추가. 이유: 표가 단일 출처다. 더하려면 표부터 고친다.
- 검증: `npm test` — 화면 테스트에서 `track` 의 이벤트·속성 인자 확인, 출생 정보 입력 화면 테스트에서 입력한 날짜·시각·곳 글자가 `track` 인자 어디에도 없다.
- 실행 패턴: 혼자
- 결과 요약:

### 7. identify-and-reset · 상태: 완료
- 읽을 것: 태스크 2·3 결과, `src/features/auth/session-store.ts`, 로그아웃·계정 삭제 코드
- 할 것: 로그인·가입 성공 뒤와 앱 시작 때 세션이 있으면 `GET /auth/session` 의 `analyticsId` 로 `identify`. 로그아웃·계정 삭제 뒤 `resetAnalytics`.
- 하지 말 것: 계정 id·이메일을 사용자 id 로 쓰기. 이유: "보내지 않는 것".
- 검증: `npm test` — 로그인 성공 → `identify(서버 값)`, 로그아웃 → `resetAnalytics`, 서버가 204(옛 서버)면 `identify` 안 함, 로그아웃 뒤 다른 계정으로 로그인하면 새 값으로 `identify`.
- 실행 패턴: 혼자
- 선행: 태스크 2.
- 결과 요약:

### 8. privacy-items · 상태: 대기
- 읽을 것: 결정 040, 각 도구의 데이터 처리 문서, 앱 스토어 App Privacy·구글 플레이 데이터 보안 안내
- 할 것: `docs/privacy-analytics.md` — 처리방침에 넣을 항목(수집 항목, 목적, 처리 위탁·국외 이전 받는 곳, 보관 기간 = 각 도구 설정값)과 두 스토어의 개인정보 항목에서 고칠 것. 문안은 쓰지 않는다. `docs/release-1.0.0.md` 의 처리방침 줄에서 이 문서를 가리킨다.
- 하지 말 것: 법적 판단을 확정처럼 쓰기. 이유: 소유자가 확정한다. 모르는 것은 `[확인 필요]`.
- 검증: 문서에 "보내지 않는 것" 목록과 위 네 항목이 있다.
- 실행 패턴: 혼자
- 결과 요약:

### 9. staging-verify · 상태: 대기
- 읽을 것: 태스크 3~7 결과, 이 계획의 "리뷰 초점"
- 할 것: 스테이징 웹(`https://app.staging.byeolmyeong.com`)에서 첫 진입을 일반 주소·공유 링크·초대 링크·카카오 로그인 돌아오기로 각각 열고, 앰플리튜드·GA4 로 가는 네트워크 요청을 모은다.
- 검증: 모은 요청 본문·주소에 공유 id·초대 id·`code=`·입력한 출생 날짜가 0건. 앰플리튜드 스테이징 프로젝트와 GA4 DebugView 에 웹에서 나는 이벤트가 도착(스크린샷).
- 실행 패턴: 혼자(브라우저 도구)
- 차단 예상: 소유자의 앰플리튜드·파이어베이스 키가 스테이징 환경 변수에 있어야 한다.
- 결과 요약:

## 검증 (전체)
- 앱 `/verify`(테스트·타입 검사·린트) 통과, 서버 `./gradlew build` 통과.
- 태스크 9 의 0건 확인과 도착 스크린샷.

## 리뷰 초점 (어떤 태스크의 테스트도 안 치는 입력·조건)
1. 웹 첫 진입이 공유·초대·카카오 돌아오기 주소일 때, SDK 가 초기화하며 저절로 보내는 요청(세션 시작·첫 방문·유입 정보)에 전체 주소가 실리는가 → 태스크 9 에서 이 네 주소로 확인한다.
2. GA4 웹 스트림의 "향상된 측정"이 콘솔에서 켜져 있으면 코드와 상관없이 페이지 조회·사이트 검색(쿼리)이 나간다 → 준비 항목에 "끄기", 태스크 9 에서 확인.
3. 로그아웃 뒤 다른 계정으로 로그인했는데 초기화를 안 하면 두 사람이 한 사용자로 합쳐진다 → 태스크 7 테스트.
4. 키가 없는 로컬 개발·파이어베이스 설정 파일이 없는 빌드에서 앱이 뜨는가 → 태스크 4 검증.
5. 카카오톡에서 공유 링크로 들어올 때 레퍼러·유입 속성에 공유 id 가 들어가는가 → 태스크 9.

## 자동 반복
- 하지 않는다. 소유자 계정·키가 필요한 단계(4·9)가 섞여 있다.

## 사용자만 할 수 있는 준비
- 앰플리튜드: 가입, 프로젝트 2개(스테이징·운영), API 키를 Vercel 스테이징·운영 환경 변수와 EAS 환경 변수 `EXPO_PUBLIC_AMPLITUDE_API_KEY` 에.
- 파이어베이스: 프로젝트 2개(스테이징·운영, 푸시와 같이 쓴다), 프로젝트마다 iOS(`com.byeolmyeong.app`)·안드로이드(`com.byeolmyeong.app`)·웹 앱 등록. 설정 파일은 EAS 파일 환경 변수, 웹 설정값은 `EXPO_PUBLIC_FIREBASE_*`.
- GA4 웹 데이터 스트림: 향상된 측정 끄기, 데이터 보관 기간 정하기.
- 처리방침 문안 확정(태스크 8 의 항목으로).

## 위험 · 되돌리기
- 계정을 지워도 분석 도구에는 그 사람의 이벤트가 남는다. 분석용 id 는 해시라 계정이 지워지면 사람과 이어지지 않지만, 처리방침의 보관 기간과 삭제 요청 방식은 소유자가 정한다(`[확인 필요]`).
- 무료 한도를 넘을 것 같으면 `screen_viewed` 를 먼저 줄인다. 한도 숫자는 결정 040 한 곳에만 적는다.
- 되돌리기: 키를 비우면 전부 콘솔에만 찍힌다. SDK 를 빼려면 태스크 3~5 커밋을 되돌린다.
- 결정 번호 040 이 다른 브랜치에서 먼저 쓰이면 다음 빈 번호로 바꾼다.

## 실행 기록
- 1(adr-040-analytics): 번호 확인 `git log --all -- docs/decisions` → 040 이상 없음. `ls docs/decisions/040-*` → `docs/decisions/040-product-analytics-amplitude-ga4.md`. `git diff --stat` → `docs/release-1.0.0.md | 11 +++++++++--`.
- 3(analytics-core): 빨강(SDK 없음 · 세션 응답 3건) → 초록. `npx jest src/lib/analytics src/lib/__tests__/api-auth.test.ts src/features/auth` → `Tests: 75 passed`. 전체 `npx jest` → `Test Suites: 56 passed · Tests: 787 passed`, `npx tsc --noEmit` exit 0, `npx expo lint` 경고 0, `npx expo export --platform web` 성공 · `웹 js 27개 중 앰플리튜드 포함: 2개`. 커밋 84ff30a.
  - 처음 전체 실행에서 maintenance-gate·chart-screens 첫 테스트가 5초 시간 초과로 실패 → 따로 돌리면 이 브랜치·main 원본 모두 51개 통과, 다시 전체 실행에서 787 통과. 부하로 인한 흔들림이다(이번 변경과 무관).
  - 결정: 공유 화면 경로는 `/s/[shareId]` 다 — 계획·결정 040 의 `/shared/…` 예시는 서버 API 경로였다. 둘 다 고쳤다 — 틀리면 비용: 없음.
  - 결정: 앰플리튜드의 웹 유입 정보(attribution)를 끈다 — 레퍼러·첫 주소가 실려 갈 수 있고, 유입은 GA4 가 본다 — 틀리면 비용: 앰플리튜드에서 유입별 퍼널을 못 나눈다(GA4 와 사용자 id 로 맞춰 본다).
  - 결정: IDFV·통신사도 끈다(결정 040 의 IP·광고 id 에 더해) — 성공 지표에 필요 없다 — 틀리면 비용: iOS 재설치 뒤 같은 기기를 못 알아본다(로그인하면 분석용 id 로 이어진다).
  - 결정: `initAnalytics()` 를 루트 레이아웃에서 부르는 일까지 이 태스크에서 했다 — 웹 묶음에 SDK 가 실제로 들어가는지 확인하려고. 키가 없으면 아무것도 하지 않는다.
  - 결정: 기존 테스트 2곳의 기대값을 바꿨다(`getSession` 의 `data: null` → `{ analyticsId: null }`, 세션 저장소 테스트의 가짜 응답) — 결정 040 의 계약 변경이다.
- 2026-11-26 다시 시작(앱 #30 · 서버 #21 을 develop 위로, 558 · 188 개 뒤).
  - 결정 081(소유자 2026-11-26): GA4 는 1.1.0, 앰플리튜드 프로젝트는 운영 하나(키는 EAS production · Vercel byeolmyeong-app Production 에만, 소유자 확인 뒤 넣고 지문으로 같은 값 확인).
  - 2(server-analytics-id): `GET /auth/session` 200 안은 지금 웹을 '확인하지 못함'에 가둔다(jest 재현: `getSession → INVALID`, 웹 `offline`). 그래서 `GET /auth/analytics-id` 를 더하기만 했다. 빨강(경로 없음 5개 중 1 실패) → auth 174 통과 → 서버 #21 CI 초록 → 8a 가 develop 에 합침(2033b88).
  - 3 의 "204 · 200 둘 다 받기"는 되돌렸다. 대신 `api.getAnalyticsId()`.
  - 7(identify-and-reset): `features/auth/analytics-link.ts`.
    - 키가 있을 때만, 로그인 상태가 되면 한 세션에 한 번 받아 identify 한다.
    - 로그인 상태에서 로그인 전이 되면 reset 한다. 켰을 때 처음부터 로그인 전이면 reset 하지 않는다.
    - 받는 중에 로그아웃하면 늦게 온 값을 버린다.
    - 세션 저장소 `onSignedIn` → `login_completed` · `signup_completed`. 시험: 잇기 7개, 저장소 3개.
  - 6(track-events): 화면 파일은 되도록 손대지 않았다.
    - 경로로 정하는 것(`routes.ts`, 루트 레이아웃의 `useRouteAnalytics` 하나): `app_opened` · `screen_viewed` · `birth_input_started`.
    - 끝까지 읽음: `Screen` 의 스크롤에 `onReadScroll`. 내용이 화면보다 짧으면 세지 않는다.
    - 그 밖: `chart_viewed`(차트 화면 한 줄), `reading_viewed`(ReadingView · YearView · LifeView · PeriodView · DayView · 나 탭 한 줄), `login_started`(SocialButton), `share_started`(ShareEntry 열기), `shared_link_opened`(공유 카드를 받았을 때).
    - 시험: 경로 6 · 훅 3 · 로그인 버튼 1 · 공유 1(지운 줄로 빨강 확인) · 공유 페이지 1.
  - 결정: 해석 종류 · 공유 카드 값 목록을 지금 화면에 맞췄다(결정 081 결과). 틀리면 비용: 11-19 표 이름으로 만든 차트가 없어 비용 없음.
  - 결정: 끝까지 읽음은 스크롤로만 잰다. 틀리면 비용: 화면보다 짧은 글은 끝까지 읽음이 안 잡힌다(해석 글은 대개 화면보다 길다).
  - 웹 CSP: `connect-src` 에 `https://api2.amplitude.com`(결정 081 의 5).

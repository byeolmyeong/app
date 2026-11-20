---
type: decision
tags: [로그인, 구글 로그인, 웹, OpenID Connect, 리디렉트, GIS, nonce, 화면 읽기, 커서]
status: active
last_reviewed: 2026-11-20
superseded_by:
---
# 070. 웹 구글 로그인은 우리 버튼에서 구글 OpenID Connect 리디렉트로 보내고, `/auth/google` 에서 ID 토큰을 받는다

> 상태: 활성 · 결정일 2026-11-20(소유자가 스테이징 웹에서 짚음: 카카오 · Apple 은 손가락 커서인데 구글 버튼만 손가락이 나오지 않는다 — PR #51 뒤에도 같음) · 결정 067 의 4 중 "로그인은 GIS 로 받는다 — GIS 버튼을 우리 버튼 위에 투명하게 겹친다" 와 결정 034 의 1 의 웹 구글 칸("구글 공식 웹 버튼(GIS) → ID 토큰")을 대체한다 · 버튼 모양(시안 5, 결정 067 의 4)과 서버 계약(`POST /auth/login { provider: GOOGLE, idToken }`)은 그대로다

## 맥락
- 결정 067 의 4 는 웹 구글 버튼을 우리 모양으로 그리고 그 위에 GIS 버튼을 투명하게 겹쳐 누름을 GIS 가 받게 했다.
- 헤드리스 Chrome 확인(2026-11-20): 버튼 가운데의 `document.elementFromPoint` 는 GIS 의 iframe 이다. iframe 안의 커서는 구글 문서가 정해 우리 CSS(`cursor: pointer`)가 닿지 않는다 — 그래서 손가락이 나오지 않는다.
- 같은 겹치기에서 리뷰가 짚은 것: 키보드 포커스 · 화면 읽기를 GIS 버튼이 받아 구글 문구와 (구글에 로그인된 브라우저면) 계정 이메일을 읽는다. 최근 로그인 배지(결정 044 의 2)는 우리 모양에 있어 화면 읽기가 읽지 못한다. 구글 버튼을 투명하게 덮어 쓰는 것이 구글 정책에 맞는지 확실하지 않다. GIS 스크립트를 받을 때까지(최대 10초) 버튼이 흐리고 눌리지 않는다.
- 구글 OpenID Connect 문서(https://developers.google.com/identity/openid-connect/openid-connect, 2026-11-20 확인): 인가 주소는 `https://accounts.google.com/o/oauth2/v2/auth`, 필수 매개변수는 `client_id` · `nonce` · `response_type` · `redirect_uri` · `scope`, `state` 는 "선택이지만 강하게 권장". `scope` 는 `openid` 로 시작하고 `profile` · `email` 중 하나 이상. `prompt=select_account` 는 계정을 고르게 한다. 암시적 흐름은 응답을 주소 조각(`#`)에 싣고, ID 토큰의 `nonce` 는 "앱이 인증 요청에 실은 값" 이다. 구글 OpenID 설정 문서(`/.well-known/openid-configuration`)의 `response_types_supported` 에 `id_token` 이 있다. 암시적 흐름 문서는 사용자가 거부하면 조각에 `error=access_denied` 를 싣고 `state` 를 함께 돌려준다고 한다.
- 서버(별도 저장소 `auth/ProviderToken.kt`)는 구글 ID 토큰의 서명(구글 JWKS, RS256) · 발급자 · 대상(`aud` ∈ `GOOGLE_CLIENT_IDS`) · 만료를 확인한다. `GOOGLE_CLIENT_IDS` 는 웹 클라이언트 ID 다 — GIS 와 앱의 구글 라이브러리(`webClientId`)도 같은 대상의 토큰을 받아 왔다. 서버는 nonce 를 보지 않는다(서버 결정 021: "nonce — 이번에는 넣지 않는다").
- 카카오 웹은 이미 같은 모양이다: 인가 주소로 이동 → `/auth/kakao` 로 돌아옴 → 서버에 보냄(결정 034). 로그인 전 가드는 `/auth/…` 를 언제나 연다.

## 결정
1. **웹 구글 버튼은 다른 공급자와 같은 우리 버튼(`SocialButton`, Pressable)이다.** 누르면 구글 인가 주소로 이동한다:
   `https://accounts.google.com/o/oauth2/v2/auth?client_id=<EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID>&redirect_uri=<웹 출처>/auth/google&response_type=id_token&scope=openid email profile&nonce=<랜덤>&state=<랜덤>&prompt=select_account`.
   state · nonce 는 추측할 수 없는 값(각 128비트)을 만들어 이 탭의 sessionStorage 에 두고, 돌아와서 한 번 꺼내며 지운다(카카오의 state 와 같은 방식). 클라이언트 ID 가 없으면 버튼을 그리지 않는다. GIS 스크립트는 더 싣지 않는다.
2. **돌아오는 화면 `/auth/google`**(카카오 `/auth/kakao` 와 같은 모양 — 스플래시 그림, 화면 읽기에는 "로그인하는 중이에요" 와 기다리는 중):
   - 주소 조각의 `id_token` · `state` · `error` 를 화면을 처음 그릴 때(첫 effect · 첫 칠하기보다 앞) 변수로 꺼내면서 바로 주소에서 지우고(`history.replaceState`), 라우터가 들고 있는 조각(경로 값 `'#'`)도 지운 뒤에 대조 · 로그인한다 — 주소창 · 뒤로 가기 · 화면 공유에 토큰이 보이는 시간을 줄인다. 조각은 서버로 가지 않는다.
   - **브라우저 방문 기록(History DB)에는 남는다.** `replaceState` 는 탭의 뒤로 가기 기록만 바꾸고, 구글에서 돌아오는 순간 브라우저가 `…/auth/google#state=…&id_token=…` 을 방문한 주소로 적는다(헤드리스 Chrome 의 History DB 로 확인, 2026-11-20). 앱이 지울 수 없다 — 결과의 운영 조건이 막는다.
   - 화면 모듈은 그 화면을 그리기 직전에 읽히고(헤드리스로 잼 — 모듈 읽힘과 첫 그림의 차이 0.2ms), 라우터는 그보다 앞서 주소를 읽어 둔다. 더 이르게 지우려면 번들 시작 전(`+html` 의 인라인 스크립트)이어야 한다 — 이번에는 하지 않는다.
   - 로그인은 세션 저장소의 시작 확인(`GET /auth/session`)이 끝난 뒤에 보낸다. 새로 연 페이지라 두 요청이 거의 함께 나가는데, 세션의 401(→ 로그인 전)이 로그인 응답보다 늦게 오면 성공한 로그인을 덮는다(카카오 `/auth/kakao` 도 같다).
   - 보낸 state 가 없거나 다르면 받지 않는다. ID 토큰 안의 `nonce`(가운데 조각을 base64url 로 풀어 읽는다)가 보낸 nonce 와 다르면 받지 않는다. 서명 · 발급자 · 대상 · 만료는 앱이 보지 않는다(서버 몫).
   - 맞으면 지금과 같은 길(`signIn({ provider: 'GOOGLE', idToken })` → `POST /auth/login`)로 보내고 계정이 있으면 홈, 처음 온 사람이면 가입 단계로 간다.
   - `error=access_denied`(사용자가 거부)는 오류가 아니다 — 안내 없이 로그인 화면으로. 그 밖의 실패(다른 `error` · state · nonce 가 다름 · 서버 실패)는 로그인 화면에 지금의 실패 안내("로그인하지 못했어요…")를 띄운다(`/login?failed=1`). 서버가 이메일이 없어 막은 것(`EMAIL_REQUIRED`, 결정 039)은 지금처럼 알림 창으로만 알린다.
   - 토큰 · state · nonce 는 로그에 남기지 않는다.
3. **최근 로그인 배지 · 누른 버튼만 돌기(결정 044 의 2 · 067 의 2)는 다른 공급자와 똑같다.** 키보드 포커스 · 화면 읽기 이름("Google로 로그인", 최근이면 ", 최근 로그인")과 손가락 커서는 우리 버튼이 받는다. 카카오처럼 화면을 떠났다 오므로 기다리는 동안은 돌아오는 화면(스플래시 모양)이다.
4. **서버 계약(`POST /auth/login { provider: GOOGLE, idToken }`)은 그대로지만 서버 쪽 위험은 바뀐다.** GIS · 앱의 구글 토큰은 주소에 실리지 않았는데, 이 흐름의 토큰은 브라우저 방문 기록에 남는다. 서버는 nonce · jti 를 보지 않으므로 기록에서 꺼낸 토큰을 만료(최대 1시간)까지 `POST /auth/login` 에 다시 쓸 수 있다 — 결과의 운영 조건(서버 결정 047)이 이것을 막는다. nonce 와 state 는 브라우저로 돌아오는 응답을 지킨다 — 남이 만든 주소(남의 토큰을 실은 조각)로 이 화면을 열게 해 그 계정으로 로그인시키는 것을 앱이 받지 않는다.

## 근거
- 손가락 커서 · 키보드 포커스 · 화면 읽기 · 최근 로그인 배지가 모두 우리 버튼 하나에 모여 다른 공급자와 같은 코드가 된다. 구글이 그린 것을 덮지 않으므로 정책 질문이 없어진다.
- ID 토큰을 받으므로 서버 계약 · 서버 코드가 그대로다. 카카오 웹과 같은 "이동 → 돌아오는 화면" 모양이라 화면 · 가드 · 배포 설정이 이미 있다.
- 스크립트를 기다리지 않아 버튼이 처음부터 눌린다.

## 대안
- GIS 겹치기 그대로(결정 067 의 4) — 커서를 고칠 수 없고(구글 iframe 안), 화면 읽기가 구글 문구 · 이메일을 읽는다.
- 우리 버튼에서 GIS One Tap(`google.accounts.id.prompt()`) 부르기 — 사용자가 닫으면 한동안(쿨다운) 뜨지 않고 브라우저 · 구글이 억제할 수 있어 주 버튼이 될 수 없다.
- GIS OAuth 2.0 코드 · 토큰 클라이언트(`initCodeClient` · `initTokenClient`) — ID 토큰이 아니라 인가 코드 · 액세스 토큰을 준다. 서버가 코드를 바꾸거나(클라이언트 비밀) 다른 확인을 해야 해 서버 계약이 바뀐다.
- GIS 리디렉트(`ux_mode: 'redirect'`) — 버튼은 여전히 GIS 가 그리고, 토큰을 서버 주소(`login_uri`)로 바로 보내 서버 경로가 새로 필요하다.
- 같은 인가 주소를 팝업 창으로 — 팝업 차단 · 창 사이 메시지 처리가 더 들고, 카카오 웹과 모양이 달라진다.
- 인가 코드 + PKCE(`response_type=code`) — 토큰이 주소 · 방문 기록에 실리지 않는다. 서버가 코드를 바꾸는 경로(웹 클라이언트 비밀)가 새로 필요해 서버 계약이 바뀐다.
- `response_mode=form_post` — 구글이 ID 토큰을 돌아올 주소로 POST 해 주소 · 방문 기록에 남지 않는다. 받을 서버 경로가 필요하고(웹은 정적 출력이다) 서버 계약이 바뀐다.

## 결과·재검토 조건
- 구글 클라우드 콘솔의 웹 OAuth 클라이언트에 승인된 리디렉션 URI 세 줄이 있어야 한다: `https://app.staging.byeolmyeong.com/auth/google` · `https://app.byeolmyeong.com/auth/google` · `http://localhost:8081/auth/google`. 소유자가 넣었다(2026-11-20 21:18). 없는 주소로 보내면 구글이 `redirect_uri_mismatch` 화면을 보인다. 웹 주소가 늘면 여기에 더한다.
- 로그인할 때마다 앱 화면을 떠났다가 돌아온다(카카오 웹과 같다). 계정 고르기는 구글 화면에서 한다.
- 범위 `profile` 때문에 ID 토큰에 이름 · 사진 주소가 실려 오지만(GIS · 앱의 구글 토큰도 같다) 서버는 식별자와 확인된 이메일만 읽는다 — 결정 039 의 "이름 · 프로필 사진은 받지 않는다" 는 그대로다.
- **운영(main) 승격 전 조건 — 서버가 웹에서 온 구글 ID 토큰(azp = 웹 클라이언트)의 jti 를 만료까지 한 번만 받는다(서버 결정 047 — `used_id_tokens`, 설정 `GOOGLE_WEB_CLIENT_ID`).** 스테이징(develop)은 그 전에도 쓴다.
- 웹 정적 출력(`cleanUrls`)에 `/auth/google` 화면이 생겨 `vercel.json` 에 rewrite 를 더하지 않는다.
- 구글이 웹 클라이언트의 `response_type=id_token`(암시적 흐름)을 막으면 인가 코드 + PKCE 로 옮긴다 — 서버가 코드를 바꾸는 경로가 새로 필요하다(서버 결정).
- 결정 067 의 나머지(1 약관 글 · 2 기다림 · 3 웹 스플래시 · 4 의 버튼 모양)와 결정 034 의 나머지는 그대로다.

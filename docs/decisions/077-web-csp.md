---
type: decision
tags: [웹, 보안, CSP, 가입권, Vercel]
status: active
last_reviewed: 2026-11-21
superseded_by:
---
# 077. 웹 앱에 Content-Security-Policy 를 건다 — 보고만(Report-Only)으로 스테이징에서 위반 0 을 본 뒤 강제로

> 상태: 활성 · 결정일 2026-11-21(성능 · 보안 묶음, 소유자 승인 사항 — 세션 67 경유) · 결정 068 의 "웹 sessionStorage 의 가입권(30분)" 위험을 줄인다

## 결정
1. Vercel 웹 앱(`vercel.json` 의 `headers`, 모든 경로)에 아래 정책을 건다.
   - `default-src 'self'`
   - `script-src 'self'` + Expo Router 정적 출력의 인라인 한 줄(`globalThis.__EXPO_ROUTER_HYDRATE__=true;`)의 sha256 해시 + 애플 로그인 스크립트(`https://appleid.cdn-apple.com`, 결정 034 의 Apple JS 팝업). 구글 · 카카오 웹 로그인은 주소 이동이라 스크립트가 없다(결정 070). 분석 스크립트는 없다.
   - `connect-src 'self' https://api.byeolmyeong.com https://api-staging.byeolmyeong.com`(NetInfo 의 연결 확인은 `/` 라 'self')
   - `style-src 'self' 'unsafe-inline'` — React Native Web 과 Expo 가 `<style>` · style 속성을 쓴다. 스크립트가 아니라 가입권을 읽을 수 없다.
   - `img-src 'self' data: blob:` · `font-src 'self' data:`
   - `object-src 'none'` · `base-uri 'self'` · `form-action 'self'` · `frame-ancestors 'none'`
2. 처음에는 `Content-Security-Policy-Report-Only` 로 건다. 스테이징(app.staging)에서 화면 · 구글 · 애플 · 카카오 웹 로그인 · 공유 페이지(`/s/`)를 실제 브라우저로 지나 위반 0 을 본 뒤 같은 값을 `Content-Security-Policy` 로 바꾼다.
3. CI 의 웹 빌드 뒤 `node scripts/check-csp.mjs` 가 `dist` 의 모든 HTML 에서 인라인 스크립트의 해시가 정책에 있는지, 외부 스크립트가 없는지 본다 — Expo 를 올려 인라인 한 줄이 바뀌면 합치기 전에 실패한다.

## 근거
- 결정 068 은 가입권(세션에 준하는 30분 · 1회용 값)을 웹 sessionStorage 에 둔다. 페이지에 남의 스크립트가 들면(XSS) 그 값을 읽을 수 있다. 스크립트를 자기 출처와 정한 해시 · 애플 스크립트로만 묶으면 그 길이 막힌다.
- 해시는 nonce 와 달리 정적 출력(Vercel 이 HTML 을 그대로 준다)에서 쓸 수 있다. 42개 페이지의 인라인 스크립트가 모두 같은 한 줄이다.

## 대안
- nonce — 요청마다 HTML 을 고쳐 줄 서버가 필요하다(정적 출력과 맞지 않음).
- 인라인 한 줄을 없애기 — Expo Router 가 만든다(우리가 고치면 하이드레이션이 깨진다).
- 바로 강제 — 놓친 출처가 있으면 웹 로그인 · 공유 페이지가 깨진 채 나간다.

## 결과·재검토 조건
- 새 외부 스크립트 · API 주소 · 그림 출처를 쓰면 정책을 같이 고친다(그러지 않으면 강제 뒤에 막힌다).
- 애플 로그인을 주소 이동으로 바꾸면 `appleid.cdn-apple.com` 을 뺀다.

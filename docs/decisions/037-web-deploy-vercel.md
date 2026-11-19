---
type: decision
tags: [배포, Vercel, 웹, 스테이징, 운영, 도메인, 환경 변수]
status: active
last_reviewed: 2026-11-19
superseded_by:
---
# 037. 웹 앱은 Vercel 의 app 서브도메인에 정적으로 올리고, 스테이징과 운영을 나눈다

> 상태: 활성 · 결정일 2026-11-19 · 계획: docs/plans/2026-11-19-vercel-web-deploy.md · 출처: 소유자 대화(2026-11-19)

## 맥락
- 랜딩페이지가 따로 있고, 웹 앱(이 Expo 앱의 웹)을 Vercel 에 올린다. 소유자가 도메인 `byeolmyeong.com` 을 샀다.
- 소유자가 스테이징 서버와 운영 서버를 나눈다고 했다.
- 웹 출력은 `server`(요청마다 서버에서 그림)였다. Expo 문서: Vercel 용 서버 어댑터는 "third-party, 지속 테스트 없음"(https://docs.expo.dev/router/reference/api-routes/), 정적 출력은 대부분의 호스팅에 올린다(https://docs.expo.dev/router/web/static-rendering/). 이 앱에는 API 라우트(`+api`)가 없다.
- 공유 링크 미리보기는 고정 문구다(결정 025). 서버 렌더링이 꼭 필요한 화면이 없다.
- 진짜 로그인(소셜 로그인)이 아직 없고, 지금은 개발용 세션(`POST /auth/dev`, `EXPO_PUBLIC_DEV_SESSION`)으로 들어간다. 서버(Spring)는 아직 어디에도 배포되지 않았다.

## 결정
1. **주소**: 랜딩 `byeolmyeong.com`(따로 배포), 웹 앱 운영 `app.byeolmyeong.com`, 스테이징 `app.staging.byeolmyeong.com`. 서버는 운영 `api.byeolmyeong.com`, 스테이징 `api.staging.byeolmyeong.com`(서버 배포 때 만든다).
2. **브랜치 → 환경**: `develop` → 스테이징(Vercel Preview, develop 브랜치 도메인), `main` → 운영(Vercel Production). 작업 브랜치는 PR 마다 Vercel 임시 주소(스테이징 서버를 본다). 작업 브랜치는 `develop` 으로 PR 을 낸다.
3. **웹 출력은 정적(`web.output: static`)**. 주소에 식별자가 든 화면(`/s/<id>`, `/synastry/<id>` 와 그 아래 `report` · `direction`)은 정적 내보내기가 만든 `[id]` 화면 파일로 Vercel 이 돌려준다(`vercel.json` rewrite). 화면은 브라우저에서 주소를 읽어 그린다.
4. **환경 변수**(빌드 때 들어간다. 이름은 `.env.example`): `EXPO_PUBLIC_API_URL` · `EXPO_PUBLIC_WEB_URL` 을 환경마다 그 환경의 주소로. `EXPO_PUBLIC_DEV_SESSION=1` 은 **스테이징 · 미리보기에만** 둔다. 운영에서 켜면 누구나 개발용 세션을 받는다.
5. **Vercel**: `swyp` 팀(Pro)의 프로젝트, GitHub 저장소와 연결(브랜치마다 자동 배포). 설정 파일 `vercel.json` 은 저장소에 둔다.
6. **운영 도메인 연결은 서버 · 로그인 준비 뒤**(소유자 2026-11-19). 그때까지는 스테이징 도메인만 붙인다.
7. 앱 열기 링크(iOS 유니버설 링크 · Android 앱 링크)는 공유 링크와 같은 도메인(`app.`)에 `public/.well-known/` 파일로 둔다. 번들 ID · 서명이 정해지면(스토어 준비) 넣는다.

## 근거
- 서브도메인이면 랜딩과 앱을 따로 배포하고, 하위 경로(baseUrl) · 경로 나누기 설정이 필요 없다.
- 정적 출력은 Vercel 에서 가장 단순하고, Expo 가 테스트하지 않는 어댑터에 기대지 않는다.
- 스테이징을 develop 브랜치에 묶으면 "develop 에 합친다 = 스테이징에서 본다" 가 하나로 맞는다. golden-rules 가 이미 `develop` 을 보호 브랜치로 적고 있다.

## 대안
- 경로로 나누기(`byeolmyeong.com/app`) — Expo 하위 경로 설정 · Vercel rewrite · 공유 링크가 엮인다.
- 서버 출력 + Vercel 어댑터 — 공유 링크 미리보기에 카드 내용을 넣기 쉽지만 테스트되지 않는 어댑터다.
- Expo Hosting(EAS) — Expo 가 권하지만 랜딩과 같은 Vercel 에 두기로 했다.
- main 하나 + 운영은 수동 승격 — 소유자가 develop/main 을 골랐다.

## 결과·재검토 조건
- 서버 저장소의 `ALLOWED_ORIGINS` 에 웹 주소를 넣어야 웹이 서버를 부른다(스테이징: `https://app.staging.byeolmyeong.com` 과 Vercel 미리보기 주소). 서버 배포 때 한다.
- 공유 링크 미리보기에 카드 내용을 넣고 싶어지면 서버 렌더링(또는 Vercel 함수)을 다시 본다.
- 소셜 로그인이 붙으면 운영 도메인을 연결하고, 운영 빌드에 개발용 세션이 없는지 다시 확인한다.

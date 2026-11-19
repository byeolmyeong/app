---
type: plan
status: approved
tags: [배포, Vercel, 스테이징, 운영, 도메인]
last_reviewed: 2026-11-19
---
# 웹 앱을 Vercel 에 올린다 — app.byeolmyeong.com(운영) · app.staging.byeolmyeong.com(스테이징)

> 상태: 승인(2026-11-19, 소유자 "승인, 운영 도메인은 나중에") · 기준 2026-11-19 · 브랜치 `feat/vercel-deploy`(`feat/brand-assets` 위) · 작업 폴더 `../.wt-app-deploy`

## 목표
- 무엇을: 이 Expo 앱의 웹 버전을 Vercel 에 올리고, 운영과 스테이징을 나눈다. 랜딩페이지는 `byeolmyeong.com`(따로), 웹 앱은 `app.` 서브도메인.
- 누구를 위해: 소유자 · 팀이 스테이징에서 먼저 보고, 확인한 것만 운영에 올리게.
- 끝나면: `develop` 에 합치면 `app.staging.byeolmyeong.com` 에, `main` 에 합치면 `app.byeolmyeong.com` 에 저절로 올라간다. 공유 링크는 각 환경의 주소로 만들어진다.

## 결정된 전제 (2026-11-19 소유자)
- 도메인 `byeolmyeong.com`(소유자가 샀다). 랜딩은 `byeolmyeong.com`, 웹 앱은 `app.byeolmyeong.com`.
- 스테이징 · 운영을 나눈다. `develop` → 스테이징, `main` → 운영.
- 웹 출력은 정적(`static`). Expo 문서: 서버 출력의 Vercel 어댑터는 "third-party, 지속 테스트 없음"(https://docs.expo.dev/router/reference/api-routes/), 정적은 대부분의 호스팅에 올릴 수 있다(https://docs.expo.dev/router/web/static-rendering/). 이 앱에는 API 라우트(`+api`)가 없다.
- 공유 링크 미리보기는 지금처럼 고정 문구(결정 025). 정적이어도 바뀌지 않는다.

## 내 결정 (묻지 않고 고른 기본값)
- **주소**

  | | 웹 앱(Vercel) | 서버(API) | Vercel 환경 | 브랜치 |
  |---|---|---|---|---|
  | 운영 | `app.byeolmyeong.com` | `api.byeolmyeong.com` | Production | `main` |
  | 스테이징 | `app.staging.byeolmyeong.com` | `api.staging.byeolmyeong.com` | Preview(`develop` 브랜치 도메인) | `develop` |
  | 그 밖의 PR | Vercel 이 주는 임시 주소 | 스테이징 서버 | Preview | 작업 브랜치 |
- **환경 변수**(빌드 때 들어간다): `EXPO_PUBLIC_API_URL` · `EXPO_PUBLIC_WEB_URL` 을 환경마다. `EXPO_PUBLIC_DEV_SESSION=1` 은 **스테이징(Preview)에만** — 운영에서 켜면 아무나 개발용 세션을 받는다. 운영 공개는 소셜 로그인 뒤.
- **주소에 식별자가 든 화면**(`/s/<id>` · `/synastry/<id>` · `/synastry/<id>/report` · `/synastry/<id>/direction`)은 정적 내보내기가 만든 `[id]` 화면 파일로 Vercel rewrite 한다. 화면은 브라우저에서 주소를 읽어 그린다.
- **Vercel 연결 방식**: Git 연동(브랜치마다 자동 배포). `vercel.json` 은 저장소에 둔다.
- `develop` 은 지금의 `main` 에서 만든다. 열려 있는 PR(#22 → #23 → 브랜드 → 이 PR)의 맨 아래 #22 의 목표를 `develop` 으로 바꿔, 합치면 스테이징에서 먼저 본다.
- 앱 열기 링크(유니버설 링크 · 앱 링크)용 `.well-known` 파일은 이번에 넣지 않는다 — 앱의 번들 ID · 서명이 정해진 뒤(소셜 로그인 · 스토어 준비). 자리만 `public/.well-known/` 로 정해 둔다.

## 범위 밖
- 서버(Spring)의 스테이징 · 운영 배포. 이 계획이 끝나도 서버가 없으면 웹은 화면만 뜨고 데이터는 못 받는다. 서버 저장소의 `ALLOWED_ORIGINS` 에 두 웹 주소를 넣는 것은 서버 배포 때 한다(서버 인수인계에 적는다).
- 랜딩페이지 배포. 관리 화면(`byeolmyeong-admin`) 배포. 유니버설 링크 파일.

## 소유자가 해야 하는 것 (내가 못 하는 것)
- DNS: 도메인을 산 곳(또는 DNS 를 맡긴 곳)에서 `app` · `app.staging` 의 CNAME 을 Vercel 이 알려 주는 값으로 넣는다. Vercel 이 DNS 를 맡고 있으면 내가 한다.
- Vercel 이 GitHub 의 `byeolmyeong` 조직 저장소를 읽게 허용(Vercel GitHub 앱 설치, 브라우저에서 한 번).
- PR #22 의 목표를 `develop` 으로 바꾸는 것과 `develop` 을 올리는 것(push)은 내가 하되 승인받고 한다.

## 전역 제약
- Expo SDK 58 · Node 22. 새 패키지 없음(정적 내보내기는 이미 있는 `expo export`). 커밋은 문서 · 설정 · 코드를 나눈다.
- 비밀값은 문서에 적지 않는다. 환경 변수 이름만.

## 태스크

### 1. adr-web-deploy  · 상태: 완료
- 할 것: `docs/decisions/037-web-deploy-vercel.md`(위 전제 · 주소 표 · 환경 변수 · DEV_SESSION 은 스테이징만 · 정적 출력 · develop/main). CLAUDE.md 명령어 절에 배포 한 줄, `.env.example` 에 환경별 값의 예(주소만), docs/architecture.md 의 환경 변수 절, docs/release-1.0.0.md 의 웹 주소.
- 검증: ADR 037 이 025 · 033 을 가리키고 CLAUDE.md 가 80줄 이하.

### 2. static-output  · 상태: 완료
- 할 것: `app.json` 의 `web.output` → `static`. `npx expo export -p web` 으로 `dist/` 에 화면별 HTML 과 `[shareId]` · `[id]` 화면 파일이 생기는지 확인. 정적 렌더링(빌드 때 Node 에서 화면을 한 번 그림)에서 깨지는 코드(모듈 맨 위의 `window` · `localStorage` 등)가 있으면 고친다. `vercel.json`(build `npx expo export -p web`, 출력 `dist`, `cleanUrls`, 식별자 화면 rewrite 넷, `framework: null`).
- 검증: `npx expo export -p web` exit 0, `dist/s/[shareId].html` 등 존재, `vercel build` 후 로컬(`vercel dev` 또는 `npx serve` + 같은 rewrite)에서 `/s/abc` · `/synastry/abc` 가 404 가 아님, 콘솔 에러 0.

### 3. vercel-project  · 상태: 진행(GitHub 연결 · 소셜 로그인 값 대기)
- 할 것: `vercel link`(새 프로젝트 `byeolmyeong-app`), Git 연동, Production 브랜치 `main`, 환경 변수(Production · Preview(develop) · Preview(그 밖)), 도메인 `app.byeolmyeong.com`(Production) · `app.staging.byeolmyeong.com`(develop 브랜치) 추가, DNS 값 소유자에게 전달.
- 검증: `vercel env ls` 에 값의 이름이 환경별로 있다 · `vercel domains inspect` 에서 두 도메인이 확인됨(DNS 가 걸리면 "확인 대기" 로 기록).

### 4. develop-branch  · 상태: 완료(승인 후 push)
- 할 것: `develop` 을 `origin/main` 에서 만들어 올리고, PR #22 의 목표를 `develop` 으로. CLAUDE.md · golden-rules 의 브랜치 줄은 이미 `develop` 을 보호 브랜치로 적고 있다.
- 검증: `gh pr view 22 --json baseRefName` → develop

### 5. first-deploy  · 상태: 진행(스테이징 완료, 운영 대기)
- 할 것: 이 브랜치의 미리보기 배포 → 주소 확인. PR 들이 `develop` 에 합쳐지면 스테이징 배포 확인. 운영은 `develop` → `main` 을 소유자가 합칠 때.
- 검증: 미리보기 주소에서 화면이 뜬다(서버가 없으면 "인터넷 연결을 확인하고…" 오류 화면이 정상), 파비콘 · 어두운 바탕 · 콘솔 에러(서버 연결 실패 말고) 0, 스크린샷.

## 검증
- 위 태스크의 검증 + `/verify` 표 1~3.

## 리뷰 초점
1. 정적 렌더링으로 바뀌면서 루트 레이아웃 · 세션 시작 · 글꼴 적재가 빌드 때 Node 에서 깨지지 않는지 → 태스크 2.
2. 운영 빌드에 `EXPO_PUBLIC_DEV_SESSION` 이 들어가지 않는지 → 태스크 3 의 `vercel env ls`, 태스크 5 의 운영 빌드 확인.
3. 공유 링크가 환경마다 제 주소로 만들어지는지(`EXPO_PUBLIC_WEB_URL`) → 태스크 5.
4. `/s/<id>` 를 처음 열었을 때(새로 고침 · 메신저에서 열기) 404 가 아닌지 → 태스크 2 · 5.
5. 웹 루트 HTML(`+html.tsx`)의 어두운 색 체계가 정적 출력에서도 들어가는지 → 태스크 2.

## 자동 반복
- 하지 않는다.

## 위험 · 되돌리기
- 정적 출력이 맞지 않으면 `web.output` 한 줄과 `vercel.json` 만 되돌린다. Vercel 프로젝트 · 도메인은 대시보드에서 지울 수 있다.
- 운영 도메인에 서버 없는 웹이 먼저 뜬다 — 운영 도메인 연결은 서버 · 로그인 준비 뒤로 미룰 수 있다(태스크 3 에서 스테이징만 먼저).

## 실행 기록
- 2026-11-19 승인: "승인, 운영 도메인은 나중에". Vercel 범위는 `swyp` 팀(Pro).
- 결정: 운영 도메인(`app.byeolmyeong.com`) 연결은 서버 · 로그인 준비 뒤 — 소유자 답 — 태스크 3 에서는 스테이징 도메인만 붙이고, 운영 환경 변수는 미리 넣어 둔다.

### 태스크 1~5 (2026-11-19)
- ADR 037, CLAUDE.md · .env.example · architecture.md · release-1.0.0.md.
- 정적 출력: `npx expo export -p web` → HTML 22개(식별자 화면 `s/[shareId]` · `synastry/[id]` · `report` · `direction`, 로그인 · 가입 · 카카오 돌아오기 포함), `/_sitemap` 은 `expo-router` `sitemap: false` 로 끔. vercel.json 과 같은 규칙의 로컬 서버(스크래치)와 실제 Vercel 에서 `/s/abc` · `/synastry/abc` · `/my` 200, 없는 주소 404, 콘솔 에러 0.
- Vercel: `swyp` 팀(`swyp-fad73311`)에 `byeolmyeong-app` 프로젝트. 환경 변수 — Production: `EXPO_PUBLIC_API_URL` · `EXPO_PUBLIC_WEB_URL`, Preview: `EXPO_PUBLIC_API_URL`. 개발용 세션은 어디에도 없음(번들에서 운영 `enabled:!1` 확인).
- 결정: 새 프로젝트의 첫 배포는 Vercel 이 자동으로 운영에 올렸다(운영 환경 변수, Vercel 로그인 보호) — 다음부터 미리보기.
- 결정: 스테이징 도메인을 브랜치 없이 붙여 몇 분 동안 운영 빌드가 공개됐다(개발용 세션 없음) — `vercel alias set` 으로 미리보기 배포를 가리키게 함. GitHub 연결 뒤 `develop` 브랜치 도메인으로 바꾼다.
- 결정: Vercel 이 `.gitignore` 끝에 붙인 `.env*` 를 지웠다 — 위의 `!.env.example` 예외를 덮는다. `.vercel` 만 남김. `package.json` engines `node 22.x`, `.vercelignore`(dist · docs/design).
- 결정(소유자): 스테이징도 개발용 세션을 끈다(주소만 알면 누구나 연다), 운영 도메인도 지금 붙인다.
- develop: 이미 있던 `develop`(옛 main 4d3395f)을 지금 main(7e364bd, 소셜 로그인 #25 포함)까지 앞으로 감음(fast-forward), PR #22 의 목표를 develop 으로.
- 소셜 로그인(#25)이 그 사이 main 에 합쳐져 #22 → #23 → #24 → 이 브랜치에 차례로 병합(강제 푸시 없이). #23 의 결정 번호 034 를 038 로 옮김(소셜 로그인이 034). 로그아웃을 마이로 옮김.
- DNS(Cloudflare, 소유자가 넣음): `app.staging` CNAME → `1fa18a8dd601061b.vercel-dns-016.com`(DNS 전용). Vercel 확인 · 인증서 발급 완료, https://app.staging.byeolmyeong.com 200.
```
$ npx jest (병합 뒤)       → Test Suites: 55 passed · Tests: 792 passed
$ npx tsc --noEmit · npx expo lint → exit 0 · exit 0
$ vercel domains verify app.staging.byeolmyeong.com → valid configuration and is verified
$ curl https://app.staging.byeolmyeong.com/login → 200
```
- 남은 것: 운영 DNS(`app` CNAME, 같은 값), Vercel GitHub 연결(소유자), 소셜 로그인 웹 값 3개를 Vercel 두 환경에(값은 소유자 `.env`), 공급자 콘솔에 두 웹 주소, 서버(`api.` 443 거부 · `api.staging` DNS 없음 · `ALLOWED_ORIGINS`), 운영 배포.

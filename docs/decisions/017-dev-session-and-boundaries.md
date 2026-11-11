---
type: decision
tags: [아키텍처, 모듈 경계, 의존 규칙, 린트, 개발용 세션, 구현 순서]
status: active
last_reviewed: 2026-11-11
superseded_by:
---
# 017. 개발용 세션으로 기능부터 만들고, 앱의 의존 규칙을 린트로 강제한다

> 상태: 활성 · 결정일 2026-11-11 · 서버 쪽 기록: 서버 저장소 `docs/decisions/004-module-boundaries-archunit.md`, `docs/decisions/005-dev-auth-first.md`

## 맥락
제품 결정 009(스플래시 직후 구글·애플·카카오 가입)는 그대로다. 다만 소셜 로그인 클라이언트 등록에는 앱 이름·번들 ID 가 필요하고, 이름은 브랜딩 뒤에 정한다. 소유자는 로그인 없이 기능부터 만들고, 그 전에 앱·서버 구조(아키텍처)를 먼저 정하기로 했다. DDD·ArchUnit 같은 의존 규칙 강제도 물었다.

## 결정
- 구현 순서: 개발 빌드에서는 앱이 켜질 때 서버의 `POST /auth/dev` 로 세션을 받아 바로 출생 정보 입력으로 간다. 스플래시·소개·소셜 로그인·만 14세 화면(계획 태스크 4)은 브랜딩 뒤로 미룬다.
- 개발용 세션은 환경 변수 `EXPO_PUBLIC_DEV_SESSION=1` 일 때만 쓴다. 운영 빌드에는 켜지 않는다.
- 앱 구조는 docs/architecture.md "디렉터리 구조"의 기능별 폴더(`src/features/<기능>/`)로 나눈다. 전술적 DDD 계층은 두지 않는다.
- 의존 규칙(docs/architecture.md "의존 규칙")을 ESLint `import/no-restricted-paths` 로 강제한다. `npx expo lint` 가 실패하면 규칙 위반이다. 서버의 ArchUnit 에 해당한다.

## 근거
- 로그인 입구만 임시로 두고 세션·소유자 구조는 그대로라, 나중에 소셜 로그인을 끼워도 기능 코드를 다시 만들지 않는다.
- 의존 규칙이 문서에만 있으면 agent 가 놓친다. 린트는 이미 완료 기준(/verify 1번)에 들어 있어 따로 돌릴 것이 없다.

## 대안
- 로그인 없이 기기 저장만으로 — 서버 저장(해석·랭킹)과 맞지 않는다.
- dependency-cruiser 같은 별도 도구 — 이미 있는 ESLint 로 충분하다.

## 결과·재검토 조건
- 계획 태스크 14(dev-session)·15(lint-boundaries)를 먼저 한다. 태스크 4(login)는 브랜딩 뒤.
- 개발용 세션 코드는 `src/features/auth/` 한 곳에만 두고, 소셜 로그인을 붙일 때 같은 자리에서 바꾼다.

# 앱 저장소 (byeolmyeong-app) — 앱 "별명"

점성술 몰라도 읽히는 나, 나의 사람들, 나의 타이밍 — 출생 차트를 서버가 계산하고 AI 가 용어 없이 풀어 주는 한국어 서양 점성술 서비스. 1.0.0 은 결제·횟수 제한·광고 없이 무료이고, 1.1.0 부터 광고와 자세한 풀이 유료화를 붙인다. 이름은 "별이 지어 준 이름": docs/decisions/032-keep-name-byeolmyeong.md

## 항상 (자동 로드, 합계 30,000자 이내)
- Expo 규칙·명령: @AGENTS.md
- 위반 금지 규칙: @docs/golden-rules.md
- 인수인계: `.local/handoff.md`가 있으면 지금 읽는다. 지난 세션이 어디까지 했고 다음에 뭘 할지가 있다.

## 상황별 (그 일을 할 때만 읽는다)
- 제품 방향·버전별 범위·지표를 판단할 때 → docs/product.md
- 1.0.0 에 무엇이 들어가는지(기능·화면·출시 기준) → docs/release-1.0.0.md
- 디렉터리 구조·의존 규칙·데이터 흐름·비즈니스 룰을 볼 때·바꿀 때 → docs/architecture.md (의존 규칙은 ESLint 가 강제, 결정 017)
- 지금 할 일 → docs/plans/2026-11-10-app-1.0.0.md
- 화면을 만들 때 → DESIGN.md (원칙·쓰지 않는 것·값의 위치), docs/design/product-brief-1.0.0.md (기획안). 화면 디자인은 프로덕트 디자이너가 새로 만든다
- 코드 어디서 시작할지 모를 때 → docs/codebase-map.md (`/agent-codebase bootstrap` 이 만든다)
- "왜 이렇게 됐나"가 궁금할 때 → docs/decisions/ ADR 번호순. 바뀌면 새 번호로 대체. 종합된 답은 docs/synthesis/.

## 디렉터리 (이름이 곧 지시)
- `src/app/` 화면(Expo Router, 파일이 곧 라우트) · `src/features/<영역>/` 화면 로직(chart·auth·onboarding·home·me·reason·reading·timing·notifications·push·my·share·support·update — 1.1.0 대기: synastry·direction·audio, 결정 055 · 069) · `src/components/` 공용 부품 · `src/content/` 문구 · `src/lib/` 서버 호출
- 서버(Spring Boot)는 별도 저장소다. 앱과는 HTTP API 로만 만난다. 근거: docs/decisions/004-spring-backend.md
- `docs/` agent가 참고할 문서 · `docs/raw/` 원본(던지는 곳, 고치지 않음) · `.claude/` 설정·규칙·스킬·에이전트·훅
- `assets/brand/` 브랜드 그림 원본(SVG) · `scripts/` 개발 도구(`render-brand.mjs`: SVG → `assets/images/` PNG, 결정 035 · `pretendard-web.py`: 웹 부분 글꼴 → `public/fonts/`) · `assets/fonts/` 앱 글꼴(공식 OTF 그대로, app.json 의 expo-font 플러그인이 빌드 때 넣는다 — 바꾸면 새 앱 빌드 · 개발 빌드도 다시, 결정 086) · `assets/audio/` 음악 세 곡(바꿔 끼우는 법은 그 README, 결정 062 — 1.0.0 에서는 꺼 둠, 결정 069)
- `dist/`·`ios/`·`android/` 는 생성물이다(커밋 안 함, 손으로 고치지 않음).

## 스택
- 앱: Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript · Node 22(`.nvmrc`). 버전 문서: https://docs.expo.dev/llms.txt
- 서버(별도 저장소 `../byeolmyeong-api`): Spring Boot(Kotlin) · PostgreSQL · OpenAI API. 차트 계산도 서버가 한다. 결제(1.1.0): RevenueCat.

## 명령어 (Node 22)
- 개발: `npx expo start --web` · 빌드: `npx expo export --platform web` · 테스트: `npm test` · 린트/타입: `npx tsc --noEmit && npx expo lint`
- 패키지 설치: `npx expo install <패키지>` 만. 환경 변수 이름은 루트 `.env.example`
- 브랜드 그림 PNG 다시 만들기(앱 아이콘 · 스플래시 · 공유 카드): `node scripts/render-brand.mjs` 뒤 `scripts/compress-png.mjs`(스플래시 · 기본 별이를 팔레트 PNG 로 — 사용법은 그 파일)
- 기기 개발 빌드(소셜 로그인은 Expo Go 에서 안 된다, 결정 034): `npx eas-cli@latest build --profile development`(iOS 시뮬레이터는 `development-simulator`). 공급자 값은 EAS `development` 환경 변수(운영과 같은 값, 결정 041) → `app.config.ts`. 로컬 `npx expo run:*` · Metro 는 `.env`
- 웹 배포(Vercel, 결정 037): `develop` → app.staging.byeolmyeong.com, `main` → app.byeolmyeong.com. 작업 브랜치는 `develop` 으로 PR. 설정은 `vercel.json` — CSP 머리도 여기(결정 077). 새 외부 스크립트 · API 주소를 쓰면 정책도 고치고, 웹 빌드 뒤 `node scripts/check-csp.mjs`
- 테스트앱 "별명 테스트"(스테이징 서버, TestFlight 에만, 결정 041): `npx eas-cli@latest build --profile test --platform ios --auto-submit`. 운영앱은 `--profile production`. 값은 EAS 환경 변수(preview · production)

## 도구 (.claude/)
- 스킬 `/plan-feature`(킷 제공): 한 커밋을 넘는 요청은 바로 만들지 않는다. `docs/plans/`에 계획 파일 → 승인 → 실행 → 검증.
- 스킬 `/verify`: 완료 기준(타입·테스트·빌드·화면) 한 번에. 표의 명령·기준값이 이 프로젝트의 "완료"다.
- 스킬 `/ralph-loop`(킷 제공): 기준이 명령으로 측정되면 상한 N 안에서 충족할 때까지 자율 반복.
- 스킬 `/handoff`(킷 제공): 며칠짜리 작업을 멈출 때. `.local/handoff.md`에 "어디까지·다음에 뭘"을 남긴다.
- 스킬 `/retro`(킷 제공): 한 달에 한 번. 반복 작업 3번 → 스킬, 같은 실수 3번 → 규칙, 안 쓰는 건 삭제.
- 에이전트 `reviewer`: 만든 쪽이 검사하지 않는다. diff와 완료 기준만 주고 깨끗한 컨텍스트에서 문제를 찾게 한다.
- 문서 큐레이션 담당: 저장소 소유자 한 명.

## 규칙
- 차트·별자리·하우스·연도를 앱에서 계산하지 않는다. 서버가 준 값만 그린다. 근거: docs/decisions/006-server-side-chart.md
- 색·글자·간격은 `src/constants/theme.ts`, 문구는 `src/content/strings.ts` 에서만 가져온다.
- 세션 토큰은 앱(iOS·Android)은 기기 보안 저장소에만, 웹은 서버의 httpOnly 쿠키에 맡긴다(앱 코드가 웹에서 토큰을 만지지 않는다, 결정 034). API 키와 프롬프트는 서버에만 있다.
- 문구에 건강·투자·미래 사건의 단정 표현을 쓰지 않는다. 궁합 점수는 서버가 준 값만 보여 준다. 근거: docs/release-1.0.0.md, docs/decisions/010-synastry-score-ranking-share-cards.md
- 결정이 바뀌면 코드보다 먼저 docs/decisions/에 새 ADR. 원본은 docs/raw/, 종합은 docs/synthesis/.
- 커밋: 한국어 + Conventional Commits. 한 커밋 = 한 관심사. 작업 브랜치에서 한다.
- 한 커밋을 넘는 일은 /plan-feature 로 계획을 승인받고 실행한다. 완료라고 말하기 전에 /verify 를 이번에 돌린다.
- 이 파일은 80줄을 넘기지 않는다. 긴 설명은 docs/ 에 두고 여기서는 가리키기만 한다.

# 별명 (byeolmyeong-app)

별이 붙여 준 나의 별명 — 출생 차트를 계산해 AI 가 용어 없이 풀어 주는 한국어 서양 점성술 서비스. 심층 리포트와 궁합을 앱에서 건당 인앱결제로 판다(결제는 핵심 기능 뒤에 붙인다).

## 항상 (자동 로드, 합계 30,000자 이내)
- Expo 규칙·명령: @AGENTS.md
- 위반 금지 규칙: @docs/golden-rules.md
- 인수인계: `.local/handoff.md`가 있으면 지금 읽는다. 지난 세션이 어디까지 했고 다음에 뭘 할지가 있다.

## 상황별 (그 일을 할 때만 읽는다)
- 제품 방향·버전별 범위·지표를 판단할 때 → docs/product.md
- 1.0.0 에 무엇이 들어가는지(기능·화면·출시 기준) → docs/release-1.0.0.md
- 모듈 경계·데이터 흐름·비즈니스 룰(시각 보정·소유자 검사)을 바꿀 때 → docs/architecture.md
- 지금 할 일 → docs/plans/2026-11-10-mvp.md
- 화면을 만들 때 → DESIGN.md (MVP 태스크 5 에서 만든다)
- 코드 어디서 시작할지 모를 때 → docs/codebase-map.md (`/agent-codebase bootstrap` 이 만든다)
- "왜 이렇게 됐나"가 궁금할 때 → docs/decisions/ ADR 번호순. 바뀌면 새 번호로 대체. 종합된 답은 docs/synthesis/.

## 디렉터리 (이름이 곧 지시)
- `src/app/` 화면(Expo Router, 파일이 곧 라우트) · `src/features/<영역>/` 비즈니스 로직(chart·birth·reading·synastry) · `src/components/` 공용 UI
- 서버(Spring Boot)는 별도 저장소다. 앱과는 HTTP API 로만 만난다. 근거: docs/decisions/004-spring-backend.md
- `docs/` agent가 참고할 문서 · `docs/raw/` 원본(던지는 곳, 고치지 않음) · `.claude/` 설정·규칙·스킬·에이전트·훅
- `dist/`·`ios/`·`android/` 는 생성물이다(커밋 안 함, 손으로 고치지 않음).

## 스택
- 앱: Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript · Node 22(`.nvmrc`). 버전 문서: https://docs.expo.dev/llms.txt
- 서버(별도 저장소, 예정): Spring Boot · PostgreSQL · OpenAI API. 결제(보류): RevenueCat.

## 명령어 (Node 22)
- 개발: `npx expo start --web` · 빌드: `npx expo export --platform web` · 테스트: `npm test` · 린트/타입: `npx tsc --noEmit && npx expo lint`
- 패키지 설치: `npx expo install <패키지>` 만. 환경 변수 이름은 루트 `.env.example`

## 도구 (.claude/)
- 스킬 `/plan-feature`(킷 제공): 한 커밋을 넘는 요청은 바로 만들지 않는다. `docs/plans/`에 계획 파일 → 승인 → 실행 → 검증.
- 스킬 `/verify`: 완료 기준(타입·테스트·빌드·화면) 한 번에. 표의 명령·기준값이 이 프로젝트의 "완료"다.
- 스킬 `/ralph-loop`(킷 제공): 기준이 명령으로 측정되면 상한 N 안에서 충족할 때까지 자율 반복.
- 스킬 `/handoff`(킷 제공): 며칠짜리 작업을 멈출 때. `.local/handoff.md`에 "어디까지·다음에 뭘"을 남긴다.
- 스킬 `/retro`(킷 제공): 한 달에 한 번. 반복 작업 3번 → 스킬, 같은 실수 3번 → 규칙, 안 쓰는 건 삭제.
- 에이전트 `reviewer`: 만든 쪽이 검사하지 않는다. diff와 완료 기준만 주고 깨끗한 컨텍스트에서 문제를 찾게 한다.
- 문서 큐레이션 담당: 저장소 소유자 한 명.

## 규칙
- 차트 계산은 `src/features/chart/` 의 순수 함수에서만 한다. 화면·서버에서 다시 계산하지 않는다. 근거: docs/architecture.md
- 출생 시각은 `birthToUtc` 로만 UTC 변환한다. 고정 +9시간 금지. 근거: docs/architecture.md
- API 키와 프롬프트는 서버에만 둔다. 서버는 소유자를 토큰에서만 얻는다.
- 해석·문구에 점성술 용어(본문)와 건강·투자·미래 사건의 단정 표현을 쓰지 않는다. 근거: docs/product.md
- 결정이 바뀌면 코드보다 먼저 docs/decisions/에 새 ADR. 원본은 docs/raw/, 종합은 docs/synthesis/.
- 커밋: 한국어 + Conventional Commits. 한 커밋 = 한 관심사. 작업 브랜치에서 한다.
- 한 커밋을 넘는 일은 /plan-feature 로 계획을 승인받고 실행한다. 완료라고 말하기 전에 /verify 를 이번에 돌린다.
- 이 파일은 80줄을 넘기지 않는다. 긴 설명은 docs/ 에 두고 여기서는 가리키기만 한다.

---
type: plan
status: approved
tags: [브랜딩, 로고, 앱 아이콘, 캐릭터, 별이]
last_reviewed: 2026-11-18
---
# 별명 브랜딩 2단계 — 로고 · 앱 아이콘 · 홈 아이콘 · 캐릭터 "별이"

> 상태: 승인(2026-11-18, 소유자 "승인") · 기준 2026-11-18 · 브랜치 `feat/brand-assets`(`feat/my-flatten-settings` 위에 쌓음) · 시안: https://claude.ai/artifact/95kTJQWCKpM1D1cJkLB9Vn

## 목표
- 무엇을: 소유자가 시안에서 고른 것을 앱에 넣는다 — 로고 B(구슬 받침 레터링), 앱 아이콘 B(유리 구슬), 홈 아이콘(빛나는 카드), 캐릭터 A "별이", 공유 카드 B(별이와 함께).
- 누구를 위해: 앱을 처음 여는 사람에게 "별이 지어 준 이름" 이 그림으로 보이게. 1분 가까이 기다리는 화면을 덜 지루하게.
- 끝나면: 앱 아이콘 · 스플래시 · 홈 머리 · 홈 아이콘 · 기다리는 화면 · 빈 화면 · 오류 화면에 브랜드 그림이 들어간다. 모두 SVG(코드)라 크기와 상관없이 선명하다.

## 결정된 전제
- 시안 선택(2026-11-18 소유자, 넷 다 추천안): 로고 B · 앱 아이콘 B · 홈 빛나는 카드 · 캐릭터 A 별이.
- 결정 033: 빛 · 유리 · 네 갈래 별은 브랜드 자리에만. 이번에 홈 아이콘과 캐릭터가 나오는 화면이 브랜드 자리에 더해진다(ADR 035).
- 그림의 색: 빛 `#3843F4`, 빛의 심 `#E4F0FC`, 구슬 청록 `#00C8E2`, 주색 `#4752FF`(DESIGN.md "브랜드 그림").
- `react-native-svg` 15.16.0 에 `FeGaussianBlur` 가 있다(빛 번짐). 새 패키지는 넣지 않는다.

## 내 결정 (묻지 않고 고른 기본값)
- **캐릭터가 나오는 곳**: 기다리는 화면(풀이 · 방향성 · 궁합 방향성 · 궁합 리포트의 "짓는 중")은 "생각 중", 같은 화면의 실패는 "머쓱", 출생 정보가 없을 때(`ChartEmpty`)와 홈의 "아직 별명을 짓지 않았어요" 는 "쉬는 중", 스플래시는 "기본". 시기 탭 안의 작은 방향성 칸은 그대로 둔다(칸이 작다).
- **움직임**: DESIGN.md 는 시트 말고는 애니메이션이 없다. 별이의 "생각 중"(작은 별 셋이 천천히 돈다)과 "기본"(위아래로 4px 떠 있음)만 예외로 둔다. 기기의 "동작 줄이기" 가 켜져 있으면 움직이지 않는다. `react-native-reanimated`(이미 있음)로.
- **로고가 나오는 곳**: 홈 머리(지금의 차트 표식 자리, 높이 20), 스플래시, 공유 카드. 공유 카드 속 그림(별이 · 로고)은 미리 그린 PNG 로 넣는다 — 웹 이미지 저장(`html2canvas-pro`)이 SVG 필터를 그리지 못할 수 있어서, 저장한 이미지와 화면이 같도록.
- **앱 아이콘**: iOS 의 `assets/expo.icon`(Expo 기본 아이콘 묶음)을 버리고 1024px PNG 하나(`assets/images/icon.png`)를 iOS · Android · 웹이 같이 쓴다. 안드로이드 적응형 아이콘은 앞(구슬 · 별) · 뒤(밤색) · 단색 세 장. 파비콘도 같은 그림.
- **그림 원본**: `assets/brand/*.svg`(로고 · 앱 아이콘 · 스플래시). PNG 는 `scripts/render-brand.mjs`(이 컴퓨터의 Chrome 으로 SVG 를 찍는다)로 만든다. 그림을 고치면 SVG 를 고치고 스크립트를 다시 돌린다.
- **색 값**: 브랜드 그림의 색은 theme.ts 에 `BrandColors` 로 넣는다(쓰는 부품이 생겼으므로, 결정 033 의 4).

## 범위 밖
- 별이가 말하는 말풍선 · 대사, 별이 이름을 사용자에게 소개하는 화면, 앱 아이콘의 iOS 26 유리 효과용 레이어(`.icon` 묶음), 스토어 스크린샷.

## 전역 제약
- 색 · 글자 · 간격은 theme.ts, 문구는 strings.ts 에서만. 새 패키지 없음. 한 태스크 = 한 커밋, 문서와 코드 분리.
- 그림 부품은 테스트에서 상태별로 다른 얼굴(`testID`)이 그려지는지만 본다. 픽셀은 스크린샷으로 본다.

## 태스크

### 1. adr-brand-assets  · 상태: 완료
- 읽을 것: `docs/decisions/033-brand-dark-design-system.md`, `DESIGN.md` "브랜드 자리와 브랜드 그림" · "쓰지 않는 것" · "애니메이션"
- 할 것: `docs/decisions/035-brand-assets-byeoli.md`(시안 선택 · 브랜드 자리 확장 · 별이 · 움직임 예외 · 아이콘 PNG 하나). DESIGN.md 의 해당 절을 고친다(브랜드 자리에 홈 아이콘 · 캐릭터 화면, 애니메이션 예외, 별이 상태 넷과 쓰는 곳).
- 검증: ADR 035 가 033 을 가리키고 DESIGN.md 가 035 를 가리킨다.
- 결과 요약: ADR 035(로고 B · 앱 아이콘 B · 빛나는 카드 · 별이 · 브랜드 자리 · 움직임 예외 · SVG 원본), 033 머리에 대체 표시, DESIGN.md 의 브랜드 자리 · 로고 · 앱 아이콘 · 별이 · 금지 · 애니메이션 · 아이콘 줄.

### 2. brand-parts  · 상태: 완료
- 읽을 것: 시안 페이지의 그리는 법(네 갈래 별 · 불꽃 · 하트 · 달 · 유리 구슬 · 얼굴), `src/constants/theme.ts`, `src/components/chart-mark.tsx`(react-native-svg 쓰는 예)
- 할 것:
  - `theme.ts` 에 `BrandColors`(빛 · 빛의 심 · 옅은 보라 · 구슬 청록 · 테두리 무지갯빛 멈춤점 · 카드 바탕).
  - `src/components/glow.tsx`: `GlowShape({ shape: 'star' | 'flame' | 'heart' | 'moon', size, dim? })`, `GlassOrb({ size, children })`.
  - `src/components/byeoli.tsx`: `Byeoli({ state: 'default' | 'think' | 'empty' | 'error', size })`. 얼굴마다 `testID`(`byeoli-face-<state>`).
  - `src/components/brand-mark.tsx`: `BrandMark({ height })` — 로고 B. 접근성 이름은 `strings.appName`.
  - 테스트 먼저(`components.test.tsx`): 상태별 얼굴 testID, BrandMark 의 접근성 이름, 동작 줄이기에서 움직임 없음.
- 주는 것: `GlowShape` · `GlassOrb` · `Byeoli` · `BrandMark` · `BrandColors`.
- 검증: `npm test` 실패 0 · `npx tsc --noEmit && npx expo lint` exit 0
- 결과 요약: `BrandColors` · `Sizes.brandMarkHeight/byeoli/byeoliSmall/homeTile`, `glow.tsx`(모양 경로 · `useSvgIds` · `GlowDefs` · `GlowLayers` · `Sparkle` · `GlowShape`), `byeoli.tsx`(표정 넷 · 움직임 · 동작 줄이기), `brand-mark.tsx`(레터링 · 작을 때 주색 고리).

### 3. home-brand  · 상태: 대기
- 읽을 것: `src/app/index.tsx`, `src/features/home/home-categories.tsx`, `src/features/home/home-reading-card.tsx`, `src/__tests__/home-screen.test.tsx`
- 할 것: 홈 머리의 `ChartMark` → `BrandMark`(높이 20). 카테고리 아이콘 넷 → 빛나는 카드(나 별 · 관계 불꽃 · 궁합 하트 · 시기 달, 카드는 살짝 기울임). "아직 별명을 짓지 않았어요" 카드에 쉬는 중 별이(작게).
- 하지 말 것: 카테고리 시트 · 순서 · 문구 바꾸기.
- 검증: `npm test` 실패 0, 홈 스크린샷
- 결과 요약:

### 4. status-byeoli  · 상태: 대기
- 읽을 것: `src/app/reading.tsx`(60~82줄), `src/app/direction.tsx`, `src/app/synastry/[id]/direction.tsx`, `src/app/synastry/[id]/report.tsx`, `src/features/chart/chart-empty.tsx`, 각 화면 테스트
- 할 것: `src/components/status-view.tsx`: `StatusView({ state: 'think' | 'error' | 'empty', title, note?, action? })` — 별이 + 제목 + 설명 + 버튼을 가운데에. 위 네 화면의 짓는 중 · 실패 블록과 `ChartEmpty` 를 이것으로 바꾼다. 문구는 그대로.
- 하지 말 것: 화면의 상태 판단(언제 짓는 중인지) 바꾸기.
- 검증: `npm test` 실패 0, 기다리는 화면 · 실패 화면 스크린샷
- 결과 요약:

### 4b. share-card-byeoli  · 상태: 대기
- 읽을 것: 공유 카드 시안 https://claude.ai/artifact/7HrHnKwEWBM2A3ovwxPqiL 의 B, `src/features/share/share-card.tsx`, `src/features/share/share-actions.web.ts`, `docs/decisions/025-share-cards-light-typographic.md`, `src/features/share/__tests__/`
- 할 것: ADR 036(카드에 로고 · 별이를 더한다. 025 의 "더하는 것은 앱 이름과 한 줄 소개뿐" 대체, 서버 `card` 계약은 그대로). 카드 B: 위에 별이(카드 종류별 표정 — 내 별명 기본 · 궁합 점수 반가움 · 랭킹 기본 · 다음 변곡점 생각 중, 점수에 따라 표정을 바꾸지 않는다), 가운데 글, 아래에 로고와 한 줄 소개, 바탕은 위쪽이 옅게 빛나는 밤색. 별이 · 로고 · 바탕 빛은 `assets/brand/` 의 SVG 를 태스크 5 의 스크립트로 PNG 로 만들어 `Image` 로 넣는다. 별이 표정에 "반가움"(happy)을 더한다.
- 하지 말 것: 카드에 서버 `card` 밖의 글(출생 정보 · 근거)을 넣기, 점수에 따라 별이 표정 바꾸기.
- 검증: share-card 테스트(종류별 표정 이미지 · 로고 · 글), 웹에서 "이미지 저장" PNG 가 화면 카드와 같은지 한 번 열어 본다.
- 결과 요약:

### 5. icon-splash  · 상태: 대기
- 읽을 것: `app.json`, `assets/images/`, `assets/expo.icon/`
- 할 것: `assets/brand/app-icon.svg` · `splash.svg`(별이 기본 + 로고) · `adaptive-foreground.svg` · `adaptive-monochrome.svg`, `scripts/render-brand.mjs` 로 PNG(아이콘 1024, 적응형 앞 · 단색 432, 스플래시 그림, 파비콘 48). `app.json`: `ios.icon` 빼기(위 PNG 공용), 안드로이드 적응형 바탕색 `#0D0E12`, 스플래시 그림 · 폭. `assets/expo.icon` 지우기.
- 하지 말 것: 손으로 그린 PNG 섞기(원본은 SVG 하나).
- 검증: `file assets/images/*.png` 크기 확인, `npx expo export --platform web` exit 0, 파비콘이 웹에서 보임
- 결과 요약:

### 6. verify  · 상태: 대기
- 할 것: `/verify` 표, 웹 390 스크린샷(스플래시 그림 · 홈 · 짓는 중 · 실패 · 빈 화면), 리뷰어(깨끗한 컨텍스트).
- 결과 요약:

## 검증
- tsc · lint exit 0, `npm test` 실패 0, `npx expo export --platform web` exit 0, 웹 스크린샷 콘솔 에러 0.

## 리뷰 초점
1. 안드로이드 · iOS 에서 `FeGaussianBlur` 가 그려지는지(웹에서만 확인 가능) → 태스크 2 에서 블러 없이도 형태가 보이게 빛무리를 방사형 그라데이션으로 먼저 깔고, 블러는 덧칠로만 쓴다. 기기 확인은 남는 일로 적는다.
2. 기다리는 화면에서 별이 애니메이션이 화면 읽기 프로그램 · 동작 줄이기와 부딪히지 않는지 → 태스크 2 테스트, 별이는 장식이라 접근성에서 숨긴다(제목 글이 상태를 말한다).
3. 홈 아이콘 카드가 기울어져도 누르는 영역이 그대로인지 → 태스크 3 테스트(누르면 시트가 열린다).
4. SVG 필터의 id 가 한 화면에 별이 · 아이콘이 여러 개일 때 서로 겹치지 않는지 → 태스크 2 에서 부품마다 고유 id.
5. 스플래시 PNG 와 앱 첫 화면 사이에 바탕색이 번쩍이지 않는지 → 태스크 5 에서 스플래시 바탕 = `Colors.paper`.

## 자동 반복
- 하지 않는다(그림 판정은 사람 눈).

## 위험 · 되돌리기
- 위험: 기기에서 블러가 안 그려지면 빛이 약해 보인다. 방사형 빛무리가 남아 형태는 보인다.
- 작업 브랜치, 태스크마다 한 커밋.

## 실행 기록
- 2026-11-18 승인. 같은 날 공유 카드 시안에서 B(별이와 함께)를 골라("좋은데?? B로 하자") 태스크 4b 를 더했다.

### 태스크 1
- 결정: 리뷰어가 마이 브랜치의 작업 폴더를 읽는 동안 브랜드 작업은 git worktree `../.wt-app-brand`(브랜치 `feat/brand-assets`, `feat/my-flatten-settings` 위)에서 한다 — 리뷰 중 파일이 바뀌지 않게 — 마이 쪽을 고치면 이 브랜치를 다시 올린다.
```
$ grep -c "035" DESIGN.md
3
$ sed -n 6p docs/decisions/033-brand-dark-design-system.md
superseded_by: 035-brand-assets-byeoli.md (브랜드 자리의 범위 — 홈 아이콘 · 별이 화면 · 공유 카드를 더함. 나머지는 유효)
```

### 태스크 2
- 결정: 움직임은 `react-native-reanimated` 대신 React Native 의 `Animated` 와 `AccessibilityInfo` 로 — 시트가 이미 같은 방식이고 테스트 준비가 따로 필요 없다 — 틀리면 `byeoli.tsx` 의 `useLoop` 하나만 바꾸면 된다.
- 결정: `GlassOrb` 부품은 만들지 않았다 — 앱 안에서 쓰는 곳이 없다(구슬은 로고 받침과 앱 아이콘 · 스플래시 PNG 에만) — 공유 카드나 다른 화면에 필요해지면 만든다.
- 결정: 별이 · 빛 모양은 `aria-hidden` 이라 테스트에서 `includeHiddenElements` 로 찾는다.
```
$ npx jest src/components/__tests__/components.test.tsx   (부품 만들기 전)
  ● Test suite failed to run   (Cannot find module '@/components/brand-mark')
$ npx jest   (만든 뒤)
Test Suites: 48 passed, 48 total
Tests:       726 passed, 726 total
$ npx tsc --noEmit && npx expo lint
exit 0
```

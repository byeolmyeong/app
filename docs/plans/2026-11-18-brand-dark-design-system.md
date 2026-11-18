---
type: plan
status: approved
tags: [브랜딩, 디자인 시스템, 타이포그래피, 어두운 바탕]
last_reviewed: 2026-11-18
---
# 별명 브랜딩 1단계 — 디자인 시스템(색)과 타이포그래피

> 상태: 승인(2026-11-18, 소유자 "승인") · 기준 2026-11-18 · 브랜치 `feat/brand-dark-design-system`

## 목표
- 무엇을: 앱 이름은 "별명" 그대로 둔다. 소유자가 준 브랜드 시안(어두운 우주 · 푸른 보라 빛 · 유리 구슬 · 네 갈래 별)에 맞춰 색 기준과 글자 기준(`src/constants/theme.ts`), 디자인 원칙(`DESIGN.md`)을 바꾼다.
- 누구를 위해: 점성술을 모르는 20~30대. 흰 바탕에 초록을 쓴 "어디서 본 앱" 대신 별명만의 인상을 준다.
- 끝나면: 모든 화면이 어두운 바탕 · 밝은 글씨 · 푸른 보라 강조색 · 다시 잡은 글자 단계로 보인다. 부품이 theme.ts 에서만 값을 가져오므로 화면 파일은 거의 안 바뀐다. 화면 배치·부품 모양·브랜드 그림(스플래시·로고·홈 머리)은 **다음 단계**다.

## 결정된 전제
- 시안: Figma `UlZGMcMO4LidtzLlJl4KFv` 노드 `691:5432`(그림 2장 + 흰 글씨 로고 "별명"). 원본 사본은 태스크 1 이 `docs/raw/2026-11-18-brand-figma/` 에 둔다.
- 값의 단일 출처는 theme.ts, 문구는 strings.ts(golden-rules "프로젝트 규칙"). 화면 파일에 직접 적힌 색은 지금 0건(`grep` 으로 확인).
- 부품 모양(높이 56 · 모서리 12 · 하단 시트 · 드럼롤)은 결정 018 그대로 둔다. 이번에 바뀌는 건 색과 글자뿐이다.
- 웹 넓은 화면: 가운데 앱 폭만 색이 있고 바깥은 흰색(소유자 확정, 2026-11-11). 그대로 둔다.
- 차트 계산은 서버(결정 006). 차트 그림은 색 토큰만 따라 바뀐다.

## 인터뷰 결과 (2026-11-18)
| 질문 | 답 | 영향 |
|---|---|---|
| 화면 바탕 | 어두운 바탕 하나 | 밝은 모드 없음. `app.json` 의 `userInterfaceStyle` 을 `dark` 로. 공유 카드도 어두운 바탕(결정 025 의 "흰 바탕" 대체) |
| 강조색 | 푸른 보라 하나 | 초록 `#3DDB99` → 푸른 보라. 쓰는 곳(주 버튼·고른 것·포커스)은 그대로 |
| 빛·유리 효과 | 브랜드 자리에만 | 버튼·입력칸·카드는 평평하게. 빛 번짐·유리·네 갈래 별은 스플래시·로고·홈 머리·빈 화면 그림에만(다음 단계) |
| 글꼴 | Pretendard 유지, 단계 다시 | 새 글꼴 파일 없음. 굵기 400·500·600 세 가지로 줄이고 Bold·ExtraBold 파일을 뺀다 |

## 내 결정 (묻지 않고 고른 기본값)
- **색 값**(시안 그림에서 뽑은 색 → 글씨 대비를 재서 고름. 대비는 WCAG 비율):

  | 이름 | 값 | 용도 | 대비(바탕 위) |
  |---|---|---|---|
  | `paper` | `#0D0E12` | 화면 바탕 | — |
  | `raised` (새) | `#16171D` | 하단 시트처럼 바탕 위에 떠 있는 면 | — |
  | `fill` | `#1C1D24` | 입력칸·보조 버튼 바탕 | — |
  | `hair` | `#2A2B33` | 테두리·구분선·비활성 버튼 바탕 | 1.4 |
  | `muted` | `#4D4F5A` | 비활성 글씨·고르지 않은 것 | 2.4 |
  | `hint` | `#7C7E8A` | 도움말·입력 전 안내 | 4.8 |
  | `gray` | `#A9ABB7` | 보조 글씨 | 8.5 |
  | `ink` | `#F2F3F7` | 본문 글씨, 강조색 위 글씨 | 17.4 |
  | `primary` | `#4752FF` | 푸른 보라. 주 버튼·고른 것·포커스 | 3.6 (그 위 `ink` 4.8) |
  | `primarySoft` (`primaryLight` 이름 바꿈) | `#1D2050` | 고른 칩의 옅은 바탕 | 그 위 `ink` 13.8 |
  | `danger` | `#E5484D` | 오류·삭제 | 4.9 (그 위 `ink` 3.5 — 지금 흰 바탕 버튼 3.6 과 같은 수준) |
  | `canvas` | `#FFFFFF` | 웹 넓은 화면의 바깥(그대로) | — |
- 시안의 빛 색(`#3843F4`)은 바탕 위 대비가 3.0 으로 포커스 테두리에 빠듯해서 한 단 밝은 `#4752FF` 를 강조색으로 쓴다. 빛 색과 구슬의 청록(`#00C8E2`)은 브랜드 그림용으로 DESIGN.md 에만 적는다. theme.ts 에는 쓰는 부품이 생길 때(다음 단계) 넣는다.
- 시트 뒤의 막: 검정 40% → 60%. 어두운 바탕에서는 40% 로는 어두워진 게 보이지 않는다.
- 쓰는 곳이 없는 `night`·`nightGold` 는 지운다(결정 025 가 "지우는 것은 따로" 라고 남겨 둔 것).
- `primaryLight` → `primarySoft`: 어두운 바탕에서는 "옅은(light)" 이 아니라 이름이 틀린다. 쓰는 곳 5줄.
- 빨강 버튼의 글씨는 `paper`(이제 검정) → `ink`(밝은 글씨).
- **글자 단계** (크기/줄높이 · 굵기 · 자간):

  | 단계 | 지금 | 바뀐 값 |
  |---|---|---|
  | `display` | 28/39 · 700 | 28/38 · 500 · -2% (로고처럼 크고 가볍게) |
  | `title` | 24/34 · 700 | 24/34 · 600 · -2% |
  | `heading` | 18/25 · 600 | 18/26 · 600 · -1% |
  | `button` | 16/24 · 600 | 16/24 · 600 · -1% |
  | `body` | 15/23 · 400 | 15/24 · 400 · -1% (긴 글을 어두운 바탕에서 읽으니 줄 간격 1.6) |
  | `table` | 14/20 · 500 | 14/20 · 500 · 0 |
  | `label` | 12/16 · 500 | 12/17 · 500 · 0 |
  | `mono` | 12/16 · 500 | 12/17 · 500 · 0 |
  | `number` | 24/34 · 600 | 24/32 · 500 · -2% |
  | `picker` | 20/30 · 600 | 20/28 · 500 · -2% |
  - 자간 규칙: 20 이상 -2%, 15~18 -1%, 14 이하 0. 어두운 바탕의 밝은 글씨는 번져 보여 작은 글씨에 자간을 좁히면 뭉친다.
  - 굵기 규칙: 400·500·600 만. 700 을 쓰던 곳(탭 고른 것·화면 머리 제목·표 강조·칩 고른 것·차트 라벨)은 600 으로.
  - 굵기 값도 theme.ts 의 `FontWeight` 에서만 가져온다(지금은 부품 15곳에 `'700'` 같은 글자로 적혀 있다).
- 공유 카드는 화면과 같은 어두운 바탕이 된다. 결정 025 의 원칙 2("모양은 화면과 같은 디자인 시스템")를 따른 결과다.
- 앱 아이콘·스플래시 그림·로고 글자는 이번에 바꾸지 않는다. 스플래시 **바탕색**만 `paper` 로 바꿔 켜질 때 파란 화면이 번쩍이지 않게 한다.

## 범위 밖
- 화면 배치·부품 모양 개편, 브랜드 그림(빛나는 불꽃·별·하트, 유리 구슬)을 화면에 넣는 것, 로고 글자 디자인, 앱 아이콘. → 다음 단계(UI)에서 따로 계획한다.
- 밝은 모드, 기기 설정에 따른 전환.
- 서버 저장소(`byeolmyeong-api`)·관리 화면(`byeolmyeong-admin`). 관리 화면은 내부 도구라 그대로 둔다.
- 디자인 보드 PNG(`docs/design/*-v2.png`) 다시 그리기.

## 전역 제약
- Expo SDK 58 · React Native 0.88 · Node 22. 패키지 추가 없음.
- 색·글자·굵기 값은 theme.ts 에서만. 화면·부품 파일에 `#`·`rgba(`·`fontWeight: '숫자'` 를 새로 적지 않는다.
- 커밋: 한국어 Conventional Commits, 한 태스크 = 한 커밋, 문서(`docs:`)와 코드(`feat:`)를 나눈다.
- 테스트가 값을 정하는 곳(`src/components/__tests__/components.test.tsx` 의 색·글자 단계 기대값)은 테스트를 먼저 바꿔 실패를 본 뒤 theme.ts 를 고친다.

## 태스크

### 1. brand-decisions  · 상태: 완료
- 읽을 것: `docs/decisions/013-rename-app.md`, `018-design-system-from-didit.md`, `025-share-cards-light-typographic.md`, `docs/product.md` "이름" 절, `CLAUDE.md` 1줄, `README.md` 3줄, 이 계획의 "인터뷰 결과"·"내 결정"
- 할 것:
  - `docs/raw/2026-11-18-brand-figma/` 에 시안 그림 2장(png)과 `README.md`(Figma 주소·노드·로고 글꼴·뽑은 색)를 둔다.
  - `docs/decisions/032-keep-name-byeolmyeong.md`: 이름 "별명" 유지. 013 대체. 이름 풀이를 적는다: 별(★)이 지어 준 이름(名) + 사전 뜻 별명(別名, 또 하나의 이름). 앱 문구 "별이 붙여 준 나의 별명"(`strings.home.title`)이 이 뜻이다(소유자 확인 2026-11-18). 013 의 걱정(받침·닉네임으로 읽힘)은 이 풀이가 오히려 기억에 남는 점이고, 브랜드 그림과 스토어 부제로 보완한다고 적고, 상표·스토어 동명 앱·도메인은 [확인 필요]로 남긴다.
  - `docs/decisions/033-brand-dark-design-system.md`: 어두운 바탕 하나 · 푸른 보라 하나 · 빛·유리는 브랜드 자리에만 · Pretendard 400/500/600. 018 의 색·글꼴 굵기와 025 의 "흰 바탕" 을 대체(부품 모양은 018 유지). 1.0.0 계획의 "어두운 화면 모드는 만들지 않는다" 는 "모드 전환 없음" 으로 여전히 맞다고 적는다.
  - 013·018·025 머리의 `superseded_by` 에 대체 표시만 한다(본문은 고치지 않는다).
  - 이름 가칭 표시를 지운다: `CLAUDE.md` 1줄, `README.md` 3줄, `docs/product.md` "이름" 절 → 032 를 가리킨다.
- 주는 것: ADR 032·033 경로. 태스크 4 가 DESIGN.md 에서 033 을 가리킨다.
- 하지 말 것: 기존 ADR 본문 고쳐 쓰기. 이유: golden-rules "대체 표시만".
- 검증: `ls docs/decisions/03[23]-*.md docs/raw/2026-11-18-brand-figma/` → 파일 4개 이상 · `grep -n "가칭" CLAUDE.md README.md docs/product.md` → 0줄
- 실행 패턴: 혼자
- 결과 요약: ADR 032(이름 유지 · 이름 풀이)·033(어두운 브랜딩) · 013 은 superseded, 018·025 는 대체 표시 · 원본 `docs/raw/2026-11-18-figma-brand.md` + 그림 2장 · CLAUDE.md·README·product.md 의 가칭 제거.

### 2. dark-color-tokens  · 상태: 대기
- 읽을 것: `src/constants/theme.ts`, `src/components/__tests__/components.test.tsx`(색 기대값 20~33줄, 버튼 63~71줄), `src/components/button.tsx`, `src/components/sheet.tsx`, `app.json`, 이 계획의 "내 결정" 색 표
- 할 것:
  - 테스트 먼저: components.test.tsx 의 `Colors` 기대값을 새 표로 바꾸고(`raised`·`primarySoft` 추가, `primaryLight`·`night`·`nightGold` 제거), 빨강 버튼 글씨가 `Colors.ink` 인지 보는 기대를 더한다 → `npm test -- components` 실패 확인.
  - `theme.ts`: `Colors` 를 새 표대로 바꾸고 `DimColor` 를 `rgba(0,0,0,0.6)` 으로, 파일 머리 주석을 결정 033 으로.
  - `primaryLight` → `primarySoft` 이름 바꾸기: `relation-chips.tsx`·`category-chips.tsx`·`timing-view.tsx`(3줄).
  - `button.tsx`: `danger` 의 글씨 색 `paper` → `ink`.
  - `sheet.tsx`: 시트 바탕 `Colors.paper` → `Colors.raised`.
  - `app.json`: `userInterfaceStyle` → `dark`, `expo-splash-screen` 의 `backgroundColor` → `#0D0E12`.
- 주는 것: `Colors.raised`, `Colors.primarySoft`.
- 하지 말 것: 부품 모양(크기·모서리·여백) 바꾸기, 브랜드 빛 색을 theme.ts 에 미리 넣기. 이유: 범위 밖, 쓰지 않는 값.
- 검증: `npm test` → 실패 0 · `npx tsc --noEmit` → exit 0 · `grep -rn "primaryLight\|nightGold\|Colors.night" src` → 0줄
- 실행 패턴: 혼자
- 결과 요약:

### 3. typography-scale  · 상태: 대기
- 읽을 것: `src/constants/theme.ts`(`Typography`·`FontFamily`), `src/app/_layout.tsx`(`useFonts`), components.test.tsx 42~43줄, 이 계획의 "내 결정" 글자 표, `grep -rn "fontWeight" src` 결과(부품 15곳 + SVG 4곳)
- 할 것:
  - 테스트 먼저: components.test.tsx 의 `Typography.display` 기대를 `{ fontSize: 28, lineHeight: 38, fontWeight: '500' }` 로, 굵기가 400·500·600 만인지 모든 단계를 도는 기대를 더한다 → 실패 확인.
  - `theme.ts`: `export const FontWeight = { regular: '400', medium: '500', semibold: '600' } as const` 를 더하고, `Typography` 를 새 표와 자간 규칙(20 이상 -2%, 15~18 -1%, 14 이하 0)으로 바꾼다.
  - 부품·화면의 `fontWeight: '500'|'600'|'700'` 과 SVG `fontWeight="…"` 를 `FontWeight.medium|semibold` 로 바꾼다(700 → semibold).
  - `_layout.tsx` 에서 Bold·ExtraBold 적재를 빼고 `assets/fonts/Pretendard-Bold.otf`·`Pretendard-ExtraBold.otf` 를 지운다(약 3.2MB 줄어듦).
- 주는 것: `FontWeight`.
- 하지 말 것: 글자 크기를 표와 다르게 키우기, 새 글꼴 더하기. 이유: 화면 배치가 깨진다·소유자가 고르지 않았다.
- 검증: `npm test` → 실패 0 · `grep -rnE "fontWeight[=:] ?['\"]" src | grep -v constants/theme.ts` → 0줄 · `ls assets/fonts` → Regular·Medium·SemiBold·LICENSE 4개
- 실행 패턴: 혼자
- 결과 요약:

### 4. design-doc  · 상태: 대기
- 읽을 것: `DESIGN.md`, ADR 033, 이 계획의 "내 결정"
- 할 것: `DESIGN.md` 를 다시 쓴다. 원칙(어두운 바탕 · 푸른 보라 하나 · Pretendard 400/500/600), "쓰지 않는 것"(빛 번짐·유리·그라데이션·네 갈래 별은 **브랜드 자리에서만** 허용, 부품에는 금지. 이모지·두 번째 강조색·밝은 모드 금지는 유지), 값의 위치(`FontWeight` 추가), 브랜드 그림의 색(빛 `#3843F4`, 빛의 심 `#E4F0FC`, 구슬 청록 `#00C8E2`)과 시안 원본 경로. 공유 카드 줄을 "어두운 바탕" 으로.
- 주는 것: 다음 단계(UI)의 기준 문서.
- 하지 말 것: 부품 절(Button·Field·Sheet 치수) 고치기. 이유: 이번 범위 밖, 아직 그대로다.
- 검증: `grep -n "흰 바탕\|초록" DESIGN.md` → 0줄 · 문서가 ADR 033 을 가리킨다
- 실행 패턴: 혼자
- 결과 요약:

### 5. verify-screens  · 상태: 대기
- 읽을 것: `.claude/skills/verify/SKILL.md`, `.local/handoff.md` "주의"(웹 개발 서버·헤드리스 크롬 스크립트 `../.scratch/syn.mjs`)
- 할 것: `/verify` 표 1~6 을 돌린다. 화면 행은 웹 390 폭으로 홈 · 출생 정보 입력 · 차트 · 요약 풀이 · 하단 시트 하나 · 공유 시트를 찍어 `docs/design/progress/2026-11-18-brand-*.png` 에 둔다. 글씨가 안 보이는 곳(어두운 바탕 위 어두운 글씨)·흰 면이 남은 곳을 찾으면 고친다. 그다음 `reviewer` 에이전트에 diff · 완료 기준 · "리뷰 초점" 만 넘긴다.
- 하지 말 것: 기준 낮추기. `npx expo-doctor` 는 1.21.7 이 깨져 있어 `@1.21.6` 으로 돌린다(인수인계).
- 검증: verify 표 전부 통과 + 스크린샷 6장
- 실행 패턴: 혼자(리뷰만 서브에이전트)
- 결과 요약:

## 검증
- `npx tsc --noEmit && npx expo lint` → exit 0
- `npm test` → 실패 0
- `npx expo export --platform web` → exit 0
- 웹 390 폭 스크린샷 6장: 어두운 바탕, 글씨가 모두 읽힘, 흰 면이 남은 곳 없음(웹 바깥 여백 제외), 콘솔 에러 0

## 리뷰 초점
1. 웹에서 브라우저가 그리는 것(입력칸 자동 완성 노란 바탕, 스크롤바, 선택 영역)이 어두운 바탕에서 튀는지 → 태스크 5 화면 확인에서 입력칸에 값을 넣고 본다.
2. 공유 이미지 저장(웹 `html2canvas-pro`)이 `backgroundColor: Colors.paper` 로 어두운 PNG 가 나오는지 → 태스크 5 에서 공유 시트의 "이미지 저장" 을 한 번 눌러 본다.
3. 차트 휠의 행성 기호·별자리 글씨가 `ink` 로 바뀌어 어두운 바탕에서 보이는지, 궁합 겹친 휠의 "상대(빈 점)" 가 바탕색 채움이라 여전히 빈 점으로 보이는지 → 태스크 5 차트 스크린샷, `overlay-wheel.test.tsx` 는 `Colors.paper` 참조라 그대로 통과해야 한다.
4. 굵기 700 을 600 으로 내리면서 탭·칩의 "고른 것" 이 굵기만으로 구분되던 곳이 약해지지 않았는지 → 태스크 5 에서 탭·칩 화면을 본다. 약하면 색(`ink` vs `gray`)으로도 구분되는지 확인한다.
5. Bold·ExtraBold 파일을 지운 뒤 700 이상을 요청하는 곳이 남아 가짜 굵게(합성)로 그려지지 않는지 → 태스크 3 의 grep 검증.

## 자동 반복
- 하지 않는다. 화면 판정(글씨가 읽히는가)이 사람 눈이라 명령만으로 측정되지 않는다.

## 위험 · 되돌리기
- 위험: 어두운 바탕에서 안 보이는 글씨·선이 남는다(theme 를 안 쓰는 곳은 없지만, `muted` 를 글씨에 쓴 곳은 대비 2.4 로 흐리다 — 비활성 표시라 의도). 태스크 5 스크린샷으로 잡는다.
- 위험: 웹 바깥 흰색과 어두운 앱 화면이 맞닿아 어색할 수 있다. 소유자가 정한 것이라 그대로 두고, 스크린샷을 보여 준 뒤 물어본다.
- 되돌리기: 작업 브랜치라 main 은 그대로다. 태스크마다 한 커밋이라 `git revert` 로 하나씩 되돌릴 수 있다.

## 실행 기록
- 2026-11-18 승인. 시안 페이지(https://claude.ai/artifact/F9bt6ViFrYiZ8otixKMUUi)를 보고 "승인".
- 결정: 웹 넓은 화면의 바깥은 흰색 그대로 — 시안에서 물었으나 답이 없어 정해 둔 값(2026-11-11)을 따른다 — 틀리면 `Colors.canvas` 한 줄을 바꾸면 된다.

### 태스크 1
- 결정: 원본 경로를 `docs/raw/2026-11-18-figma-brand.md`(+ 같은 이름 폴더에 그림)로 — docs/raw/README.md 의 파일명 규칙(`날짜-출처-slug.md`)을 따랐다 — 틀리면 경로만 옮기면 된다.
```
$ ls docs/decisions/03[23]-*.md docs/raw/2026-11-18-figma-brand*
docs/decisions/032-keep-name-byeolmyeong.md
docs/decisions/033-brand-dark-design-system.md
docs/raw/2026-11-18-figma-brand.md
docs/raw/2026-11-18-figma-brand:
glass-star.png  glow-icons.png
$ grep -n "가칭" CLAUDE.md README.md docs/product.md
(출력 없음, exit 1)
```

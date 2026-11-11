---
type: design
tags: [디자인, UI, 안티패턴, 토큰, 천문도]
status: active
last_reviewed: 2026-11-11
---
# 디자인 가이드 — 화면을 만들 때

> 상태: 활성 · 기준 2026-11-11 · 방향은 "천문도"(결정: docs/decisions/016-design-direction-observatory.md). 보드: docs/design/design-system-v2.png(기초 값·컴포넌트), docs/design/key-screens-v2.png(핵심 화면 4개). 기획안: docs/design/product-brief-1.0.0.md. 코드 값은 앱 계획 태스크 13 에서 이 방향으로 바꿨다. 바뀔 때는 아래 "값의 위치" 의 파일만 바꾼다.

## 원칙 (3개 이내)
1. 천문도. 장식 대신 서버가 계산한 차트를 눈금 원과 가는 선으로 보여 준다. 종이 바탕에 먹 글씨, 포인트는 금 하나. 금은 "지금"과 "큰 변화"에만 쓴다.
2. 상자와 그림자 대신 가는 선과 여백으로 나눈다. 숫자(점수·도수·날짜·순위)는 고정폭 글꼴로 관측 기록처럼 읽힌다. 근거(차트 요소)는 문단 제목 오른쪽에 작은 고정폭 글자로만 둔다.
3. 주 버튼(먹 바탕)은 한 화면에 하나. 첫 흐름은 스플래시 → 로그인 → 만 14세 확인 → 출생 정보 → 요약 해석(결정 009).

## 쓰지 않는 것
| 금지 | 이유 |
|---|---|
| 그라데이션 · 반짝이 별 · 파스텔 · 그림자 · 이모지 | 흔한 운세앱과 AI 템플릿의 인상이다(결정 016) |
| 둥근 모서리(버튼 4, 카드 3 초과), 둥근 시트 | 거의 각지게 둔다 |
| 금 외의 강조색, 영역을 색으로 구분하기 | 영역은 글자로 쓴다. 금은 지금·큰 변화만 |
| 해시태그 · 알약 모양 태그 | 키워드는 한 줄 문장이나 작은 글자로 |
| `backdrop-filter` 글래스모피즘, 네온 글로우, 보라·인디고 | AI 템플릿의 흔한 징후 |
| 카드 상자로 감싼 구역, 아이콘을 둥근 배경으로 감싸기 | 구역은 선으로 나눈다 |
| 어두운 화면 모드 | 1.0.0 범위 밖. 어두운 바탕은 공유 카드에만 쓴다 |
| 화면 파일 안의 색 값·문구 직접 적기 | 값과 문구는 한 곳에서 바뀌어야 한다(golden-rules "프로젝트 규칙") |

## 값의 위치 (코드 상수가 단일 출처. 여기엔 경로와 용도만)
- 색·글자 단계·간격·모서리·부품 크기: `src/constants/theme.ts` (`Colors`, `Typography`, `Spacing`, `Radius`, `Sizes`). 목표 값은 결정 016 과 docs/design/design-system-v2.png.
- 문구: `src/content/strings.ts`
- 글꼴: 고운바탕(제목, `SerifFamily`) · Pretendard(본문, `FontFamily`) · IBM Plex Mono(숫자만 있는 곳, `MonoFamily`). Pretendard 파일과 라이선스는 `assets/fonts/`, 고운바탕·IBM Plex Mono 는 `@expo-google-fonts/*` 패키지(SIL OFL 1.1). 적재는 `src/app/_layout.tsx` 의 `useFonts`. 한글이 섞인 글자에는 고정폭을 쓰지 않는다(`table` 은 Pretendard, `mono`·`number` 만 고정폭).

## 컴포넌트·레이아웃
- 공용 부품은 `src/components/` 에만 둔다: `Txt`(글자 단계·색), `Button`(주 `primary`·선 `line`·빨강 `danger`), `Field`, `DataTable`, `ChartMark`(화면 머리의 눈금 원 표식, 도장을 대신한다), `Sheet`, `SectionLabel`. 화면 뼈대: `Screen`, `NavBar`, `Tabs`(밑줄 하나), `Checkbox`, `TextLink`, `FieldInput`.
- 차트 전용 부품은 `src/features/chart/`: `ChartWheel`(SVG 휠, 좌표는 `wheel-layout.ts`), `KeyThree`, `BodyCell`. 화면 곳곳의 작은 차트(요약 해석·궁합·공유 카드)도 같은 휠을 줄여 쓴다.
- 해석 문단: 제목(Pretendard 굵게) + 오른쪽 근거(고정폭 작은 글자) + 본문. 상자 없이 문단 사이는 옅은 선.
- 변곡점 구간: 날짜(고정폭) · 종류와 영역(오른쪽 작은 글자, 큰 변화만 금) · 기호(마디 ●, 변화·기회 ○, 운명적 만남 ✦) · 구간 제목(Pretendard 굵게). "지금"은 금색 세로줄.
- 공유 카드(9:16): 밤 바탕, 차트(종이색 가는 선 + 금 점·선), 큰 고정폭 숫자, 고운바탕 한 줄, "나도 보러 가기". 출생 정보와 근거는 넣지 않는다.
- 화면 좌우 여백 24~28, 왼쪽 정렬이 기본. 웹 넓은 화면에서는 가운데에 앱 화면 폭(`Sizes.maxContentWidth`, 480)의 종이 한 단만 보이고 그 밖은 흰색(`Colors.canvas`)이다.
- 굵은 선 1px 먹: 구역의 시작. 옅은 선 1px(먹 15%): 문단·표의 줄. 금 3px: 지금.
- 애니메이션: 시트가 올라오는 것만. 그 외 없음.
- 아이콘: 쓰지 않는다. 화살표는 글자(→ ←)다. 공유 버튼의 위쪽 화살표만 선으로 그린다.

## 검증
- `/verify` 화면 행: 주요 화면을 웹 폭 390px 로 열어 콘솔 에러 0 · 레이아웃 깨짐 없음 · 위 "쓰지 않는 것" 0건. 스크린샷은 `docs/design/progress/`.
- reviewer 에이전트가 화면을 볼 때 이 파일을 기준으로 본다.

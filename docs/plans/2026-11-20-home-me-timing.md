---
type: plan
status: approved
tags: [홈, 아래 탭, 나 탭, 시기, 오늘의 하늘, 그날의 하늘, 알림함, 공유, 이유 문장]
last_reviewed: 2026-11-20
---
# 홈 · 나 탭 · 시기 · 오늘의 하늘 · 알림함 · 공유 — 확정 시안 구현(앱)

> 상태: 승인(소유자 2026-11-20 "그 작업해야지 지금까지 만들어 놓은 것들은" — 확정 시안대로 구현) · 기준 2026-11-20 develop `29f9b6c` · 브랜치 `docs/home-me-timing-plan`(이 계획 · 결정 046~054) · 시안: 피그마 `UlZGMcMO4LidtzLlJl4KFv` 「별명」 보드 11 · 12 · 13, 캔버스 https://claude.ai/artifact/Rt33TzPSEe4PdxNRCej3xT 의 "14 시기" 보드 8개 · 서버 계획: 서버 저장소 `docs/plans/2026-11-20-home-me-timing.md`(같은 이름 브랜치, 계약 표의 원본)
> **이어받음(2026-11-20)**: `docs/plans/2026-11-20-sian-all-repos.md` 가 이 계획의 순서 · 바뀐 줄 · 새 묶음을 맡는다. 결정 055 로 아래 탭은 **넷**(궁합은 1.1.0), 057 로 휴대폰 푸시가 1.0.0 에 들어온다.

## 목표
- 무엇을: 확정 시안의 홈 v2 · 아래 탭 다섯 칸 · 나 탭(칩 다섯) · 시기 탭(이번 달 · 올해 · 인생 · 시기 자세히 · 그날의 하늘) · 오늘의 하늘 · 알림함 · 공유 v2 · "이렇게 풀이한 이유" 를 앱(iOS · Android · 웹)에 옮긴다.
- 누구를 위해: 가입한 사람이 매일 다시 열 이유(오늘의 하늘 · 이번 달)를 얻고, 나 · 시기를 따로 자세히 받는다(1.1.0 부터 유료).
- 끝나면: 아래 탭 홈 · 나 · 시기 · 마이(결정 055), `/report` · `/direction` 없음, 모든 풀이 문단에 펼치는 이유 줄, 공유는 스토리 · 이미지 저장.

## 결정된 전제
- 원본: docs/raw/2026-11-20-session-owner-qna-home-me-timing.md(질문 · 답 1~12). 정리본은 아래 결정이다.
- 앱 결정: 046 아래 탭 다섯 칸 · 047 홈 v2 · 048 나 탭 · 나 탭 풀이 · 이성 방향성 · 심층 리포트 없앰 · 049 시기 탭 v2 · 050 자세한 풀이 둘 · 1.1.0 유료 자리 · 051 오늘의 하늘 1.0.0 · 052 알림함 · 053 공유 v2 · 054 이유 문장. 대체 표시: 010 · 014 · 016 · 019 · 021 · 022 · 023 · 025 · 026 · 031 · 036.
- 서버 결정: 029 풀이 분리 · 받을 수 있나 자리 · 030 나 탭 풀이 v2 + 요약 해석 v2 · 031 근거 구조화 · 032 이번 달 계산 · 033 시기 풀이 v2 · 034 그날의 하늘 · 035 알림함 · 036 공유 v2 · 037 "~기" · 038 일 방식 수치(서버 저장소 `docs/decisions/`).
- 내 하늘 지도(시안 13)는 `feat/sky-map` 에서 따로 진행 중이다(계획 `docs/plans/2026-11-20-sky-map.md`, 별도 PR). 이 계획은 그 용어 사전(`strings.glossary`)과 휠을 나 탭 · 이유 펼침에서 함께 쓴다 — 묶음 A② 는 sky-map 이 develop 에 들어간 뒤 시작한다.
- 온보딩 v2(`feat/onboarding-v2`, 결정 044 · 045)가 먼저 develop 에 들어간다. 별명 공개의 "풀이 읽기" 대상 · `MakingView` 공용화 · 044 · 045 앞머리 표시는 그 뒤(A② 태스크). 개인정보 수집 · 이용 동의 글(`/settings/privacy-consent`)은 온보딩 v2 에서 처리한다 — 이 계획에서 다루지 않는다.
- 궁합 탭의 새 모양과 홈의 궁합 칸(랭킹 · 연애 TOP3)은 **보류**(원본 12번): 궁합 시안이 나오면 새 결정. 그때까지 궁합 탭은 지금의 `/synastry` 로 간다.

## 번호
- 앱 결정은 **046 부터**: 온보딩 v2 가 044(온보딩 v2) · 045(개인정보 수집 · 이용 동의 글)를 로컬 `feat/onboarding-v2` 에서 쓰고 먼저 합쳐진다. 040 은 `origin/feat/analytics`. 처음 045 · 046 으로 쓴 두 결정은 046 · 047 로 옮겼다(커밋 `8f7351c`).

## 확인한 사실 (2026-11-20, 코드 · 브랜치를 읽고)
- 아래 탭은 Expo Router Tabs 가 아니라 화면마다 `Screen footer` 의 `MainTabs`(`src/features/home/main-tabs.tsx` → `src/components/bottom-tabs.tsx`, 홈 · 마이 두 칸)다.
- 홈은 `src/features/home/home-categories.tsx` · `home-reading-card.tsx`. 시기 로직은 `src/features/report/timing.ts` · `timing-view.tsx`, 심층 리포트는 `use-report.ts`(5초마다 상태 확인 · 기기 보관).
- `MakingView` 는 `src/features/reading/making-view.tsx`. 온보딩 v2 가 같은 파일을 고친다 → 공용으로 옮기는 일은 온보딩 v2 가 합쳐진 뒤.
- 기능끼리 import 금지(`eslint.config.js` 의 `SHARED_FEATURE_FILES` 만 예외 — 지금 `chart/ChartWheel.tsx` · `auth/use-session.ts`).
- `origin/docs/instagram-story-share` 에 제안 상태 계획 `docs/plans/2026-11-19-instagram-story-share.md`(스토리 · 사진 저장, `EXPO_PUBLIC_META_APP_ID`, `expo-media-library`, config plugin, 태스크 1~8). 묶음 A⑤ 가 그 태스크 2~8 을 가져온다(태스크 1 의 결정은 053 이 맡는다).
- 서버(서버 저장소에서 읽음): 요약 해석 보완점 3개(시안 2개), `readings.created_at` 은 있으나 응답에 없음, `shares.kind` 에 check 제약, 근거는 낱말 목록(`generation/Basis.kt`), 시안 근거 "달이 토성이 다스리는 자리" 에는 "다스리는 별" 종류가 필요. 일 방식 막대의 시안 값은 왼쪽에서 잰 위치.

## 서버 계약 의존 (원본은 서버 계획의 "계약 표". 앱은 그 모양을 그대로 `src/lib/api.ts` 타입 · 검사 함수로 옮긴다)
| 경로 | 쓰는 앱 묶음 | 서버 묶음 |
|---|---|---|
| `POST /readings` — `sections[].reason: Reason` · `cautions[2]` · `createdAt` (옛 `basis[]` · `shareId` 는 S⑦ 까지 함께 옴) | A② (A① 은 `createdAt` 이 있으면 씀) | S① |
| `POST /me-report` 202 `{ status }` · `GET /me-report` `{ status, report?: MeReport }` — `MeArea{ area, title, keywords[3], stars[], paragraphs[{ title, body, reason }], glance?, practices?, reason?, closer?, workStyle?, shaken? }` | A② | S② |
| `GET /timing/month?month=YYYY-MM`(없으면 이번 달) — `{ month, timeKnown, themes[], days[{ date, category: PEOPLE · WORK · MIND, text, reason }] }` | A③ | S③ |
| `POST /timing-report` · `GET /timing-report` — 지금 `Report.timing` + `current.mainId` + 구간의 `summary` · `detail{ changes, howTo, after }` · `practices[3]` · `reason` | A③ · 홈 시기 칸 | S③ |
| `POST /day-sky { date? }` — `{ date, title, category, flow{ people, work, mind }, reason, practices[3], createdAt }` | A③(그날) · A④(오늘) | S④ |
| `GET /notifications` · `POST /notifications/{id}/read` | A④ | S⑤ |
| `POST /shares` 새 종류 `NICKNAME` · `ME_AREA` · `DAY_SKY` · `NEXT_BIG` | A⑤ | S⑥ |
- 공통 타입: `BasisItem`(`PLACEMENT` · `CLUSTER` · `ASPECT` · `RULER` · `TRANSIT`) · `Reason{ when: BIRTH · NOW · DAY, items[1..2] }` · `Star{ body?, sign?, house?, count? }`. 오류: 404 `NO_PROFILE` · 429 `RATE_LIMITED` · 502 `GENERATION_FAILED` · 400 `MONTH_OUT_OF_RANGE` · `DATE_OUT_OF_RANGE` · 402 `PURCHASE_REQUIRED`(1.1.0 예약).
- 앱이 더 부르지 않는 것: `POST /reports` · `GET /reports/me` · `POST /directions {LOVE|FUTURE}` · `POST /shares {READING|NEXT_TURN}`. 서버는 S⑦(새 테스트앱 빌드 뒤)에 뺀다.

## 내 결정 (묻지 않고 고른 기본값)
- 홈의 칸은 그 서버를 기다리는 묶음이 맡는다: A① 은 머리 · 별명 카드까지, 시기 카드 · 작은 실천은 A③, 오늘의 하늘 카드 · 종은 A④. 그래서 A① 은 서버 일을 기다리지 않는다(결정 047 의 3 "서버 준비 전 숨김" 을 묶음 나누기로 지킨다).
- 아래 탭은 지금의 footer 방식(결정 046). 나 · 시기 탭은 새 화면이 생기기 전까지 `/reading` · `/report?area=TIMING` 으로 간다(046 의 4).
- 기기 보관 키: `byeolmyeong.meReport.v1` · `byeolmyeong.timingReport.v1` · `byeolmyeong.daySky.v1`(날짜별, 그날만). 상태 확인은 지금처럼 5초마다.
- 이번 달 눈여겨볼 날이 0개인 달: "이번 달은 큰 움직임 없이 지나가요"(시안 없음). 알림함이 비면: "아직 알림이 없어요".
- 올해 칩의 "다가오는 시기": 오늘 뒤 1년 안에 시작하는 구간 앞에서 3개. 잠긴 칩을 누르면 "자세한 풀이" 카드로 굴린다.
- 쓰는 중 · 못 썼을 때 화면(시안 없는 것 — 열린 항목 2)은 `MakingView` 와 11-8 · 11-9 의 모양을 빌린다.
- 일 방식 막대에 숫자를 적지 않는다(048). 지나가는 별의 이유 펼침에는 작은 지도를 두지 않는다(054).
- 이유 문장 함수는 `src/features/reason/reason-sentence.ts`, `SHARED_FEATURE_FILES` 에 더한다(054). 시기 로직은 새 기능 폴더 `src/features/timing/` 으로 옮긴다(`report/` 는 A② 에서 없어진다).

## 범위 밖
- 결제(RevenueCat) · 가격 · 묶음 판매(1.1.0 계획). 휴대폰 푸시 · 오늘의 하늘 알림 켜기/끄기 · 아침 미리 만들기(푸시 계획). 궁합 탭 · 홈 궁합 칸(궁합 시안). 내 하늘 지도 화면 자체(`feat/sky-map`). 개인정보 수집 · 이용 동의 글(온보딩 v2). 옛 서버 경로 · 테이블 지우기(서버 S⑦).

## 전역 제약 (골든 룰에서)
- 차트 · 별자리 · 하우스 · 구간 · 날짜의 점성 계산을 앱에서 하지 않는다. 앱이 하는 날짜 일은 날짜 글자 비교 · 자르기, 달력 칸 배치(요일), 알림 묶음(오늘 · 7일 · 30일)뿐이다. 막대 값 · 해 · 나이 · 점 · 문구는 서버 값.
- 시각 "모름" 이면 첫인상 칸 · 상승점 · 중천 · 하우스 · 한 하우스에 모임 · 돈 구간 · 운명적 만남이 화면 어디에도 없다(받았더라도 `timeKnown: false` 면 그리지 않는다).
- 문구는 `src/content/strings.ts`, 색 · 글자 · 간격은 `src/constants/theme.ts`. 건강 · 투자 · 미래 사건 단정 금지.
- 출생 정보를 로그 · 분석 · 공유 카드에 넣지 않는다.
- 새 동작은 실패하는 테스트를 먼저 본다. 외부 응답은 검사 함수(`isMeReport` 등)로 막고, 모르는 `kind` 는 그 줄만 숨긴다.
- 결정 · 문서: 구조가 바뀌는 PR 은 같은 PR 에서 docs/architecture.md · docs/release-1.0.0.md · CLAUDE.md 를 고친다.

## PR 묶음과 순서
| 묶음 | 결정 | 기다리는 것 |
|---|---|---|
| A① 아래 탭 넷 + 홈 v2 | 046 · 047 · 055 | 없음 |
| A② 나 탭 + 나 탭 풀이 + 이유 펼침 · 말풍선 | 048 · 050 · 054 | 서버 S① · S②, `feat/sky-map` 합침, 온보딩 v2 합침 |
| A③ 시기 탭 + 홈 시기 칸 | 049 · 050 | 서버 S③ · S④ |
| A④ 오늘의 하늘 + 알림함 + 홈 오늘의 하늘 · 종 | 051 · 052 | 서버 S④ · S⑤ |
| A⑤ 공유 v2(인스타 스토리 · 이미지 저장) | 053 | 서버 S⑥, Meta 앱 ID(소유자), 새 개발 빌드 |
- 배포 순서(스테이징 · 테스트앱): S① → A① → S② → A② → S③ · S④ → A③ → S⑤ → A④ → S⑥ → A⑤ → 새 테스트앱 빌드 → S⑦. 서버 묶음은 앱 묶음보다 먼저 스테이징에 있어야 한다(앱은 없는 경로를 부르지 않는다). S① 은 옛 칸(`basis[]`)을 남기므로 지금 테스트앱이 깨지지 않는다.
- 브랜치: 묶음마다 develop 에서 `feat/home-v2` · `feat/me-tab` · `feat/timing-v2` · `feat/today-sky` · `feat/share-v2`. CI 통과 뒤에만 합친다.

## 태스크

### A① 아래 탭 넷 + 홈 v2 (결정 055)

#### 1. strings-tabs-home · 상태: 대기
- 읽을 것: 결정 046 · 047, 보드 11 · 11-1, `src/content/strings.ts` 의 `tabs` · `home`
- 할 것: `strings.tabs` 넷(홈 · 나 · 시기 · 마이 — 결정 055), `strings.home` 의 별명 카드("○○ 님" · "별명을 받은 지 ○일" · 풀이 읽기). 쓰지 않게 되는 홈 카테고리 문구는 지운다.
- 주는 것: 문구 키
- 하지 말 것: 화면 파일에 문구를 쓰지 않는다.
- 검증: `npm test -- strings` 통과, 새 키에 빈 값 없음(테스트)

#### 2. bottom-tabs-five · 상태: 대기
- 읽을 것: `src/features/home/main-tabs.tsx` · `src/components/bottom-tabs.tsx` · 그 테스트
- 할 것: `MainTab = 'home' | 'me' | 'timing' | 'my'`, 네 칸 · 시안 아이콘, 누르면 `router.replace`. 나 → `/reading`, 시기 → `/report?area=TIMING`(임시 대상은 한 곳의 표). 아래 탭을 그리는 화면: 홈 · 마이 · `/reading` · `/report`. `/synastry` 로 들어오면 홈으로(결정 055 의 1).
- 주는 것: 네 칸 탭
- 하지 말 것: Expo Router `Tabs` 로 바꾸지 않는다. 이유: 결정 046 의 2.
- 검증: 탭 넷이 보이고 누르면 그 경로로 바뀌며 뒤로 가기에 쌓이지 않는다(테스트)

#### 3. home-v2 · 상태: 대기
- 읽을 것: 결정 047, 보드 11 · 11-1, `home-categories.tsx` · `home-reading-card.tsx`, `src/app/index.tsx`
- 할 것: 홈을 머리(로고) · 별명 카드(프로필 `GET /account` 의 `avatar` · 닉네임 · 해 별자리(차트 SUN 의 `sign`) · "별명을 받은 지 ○일"(`Reading.createdAt` 이 있을 때만 — 한국 날짜 차이, 받은 날 1일) · 한 줄 별명 · 풀이 읽기 → `/reading`)로. 관계 · 궁합 칸과 `home-categories.tsx` 를 지운다. 출생 정보가 없을 때의 흐름(결정 029)은 그대로.
- 주는 것: 홈 v2 뼈대(A③ · A④ 가 칸을 더한다)
- 하지 말 것: 해 별자리를 날짜로 셈하지 않는다. 이유: 골든 룰(서버 차트 값).
- 검증: `createdAt` 있음/없음 · 시각 모름 각각의 홈 렌더 테스트, 지운 파일을 가리키는 import 없음(`npx tsc --noEmit`)

#### 4. docs-a1 · 상태: 대기
- 할 것: docs/release-1.0.0.md "화면" 표(아래 탭 넷 · 홈), docs/architecture.md 디렉터리 설명(홈).
- 검증: 지운 화면 이름이 문서에 남지 않음(`grep -n home-categories docs` 비어 있음)

#### 5. verify-a1 · 상태: 대기
- 할 것: `/verify`, 웹에서 홈 → 탭 넷 → 홈 왕복, 보드 11-1 과 나란히 스크린샷.
- 검증: 표 전부 통과

### A② 나 탭 + 나 탭 풀이 + 이유 펼침 (서버 S① · S②, `feat/sky-map` · 온보딩 v2 합친 뒤)

#### 6. adr-044-045-marks · 상태: 대기(온보딩 v2 합친 뒤)
- 할 것: 044 앞머리 `superseded_by` 에 "048-me-tab-and-me-report.md (4 의 "풀이 읽기 → 지금의 풀이 글" 만 → 내 별명)". 045(개인정보 수집 · 이용 동의 글)는 이 계획의 결정과 겹치는 데가 없는지 읽고, 없으면 표시하지 않고 실행 기록에 "확인함" 만 남긴다. 번호가 다시 밀렸으면(develop 에 046~054 가 이미 있으면) 이 계획 · 결정의 번호를 먼저 맞춘다.
- 하지 말 것: 044 · 045 본문을 고치지 않는다. 이유: 대체 표시만(골든 룰).
- 검증: `ls docs/decisions | cut -c1-3 | sort | uniq -d` 비어 있음

#### 7. api-me-reason · 상태: 대기
- 읽을 것: 서버 계획 "계약 표"(`Reading` · `MeReport` · `BasisItem` · `Reason` · `Star`), `src/lib/api.ts` 의 `isReading` · `isReport`
- 할 것: 타입 `BasisItem` · `Reason` · `Star` · `MeArea` · `MeReport` · `MeReportState`, 검사 함수 `isReason` · `isMeReport`, `requestMeReport()` · `getMeReport()`. `Reading` 에 `reason` · `createdAt`, `cautions` 2개, `isReading` 은 `reason` 이 없으면 거절(옛 보관본은 다시 받게 — 048 의 8).
- 주는 것: 나 탭 · 이유 줄의 타입
- 하지 말 것: 모르는 `kind` 때문에 풀이 전체를 거절하지 않는다. 이유: 그 줄만 숨긴다(054 의 7).
- 검증: 계약 표의 예 JSON 통과 · 필드 빠짐/타입 틀림 거절 테스트(먼저 실패를 본다)

#### 8. glossary-reason · 상태: 대기(sky-map 합친 뒤)
- 읽을 것: `strings.glossary`(sky-map), 결정 054 의 3, 시안 근거 줄 전부(보드 12 · 12-8~12-12 · 11-5 · 14-3 · 14-4)
- 할 것: 별자리 `adjective`(12), 별 `reasonName` · `transitName`(10 — 시안에 있는 말: 달 "마음" · "마음을 비추는 별", 토성 "책임을 맡은 별", 수성 "말을 맡은 별", 금성 "좋아하는 것", 나머지는 `nickname`), 각도 `reasonPhrase` · 이름(합 · 육분 · 사분 · 삼분 · 충), 별 수 말(셋 · 넷 · 다섯 …). 채운 말 목록을 실행 기록에.
- 하지 말 것: sky-map 의 기존 키 이름을 바꾸지 않는다. 이유: 하늘 지도 화면이 쓴다.
- 검증: 별자리 12 · 별 10 · 각도 5 의 새 값이 빈 값 없이 모두 있음(테스트)

#### 9. reason-sentence · 상태: 대기
- 읽을 것: 결정 054 의 2 · 6 · 7
- 할 것: `src/features/reason/reason-sentence.ts` — `Reason` + 차트의 `timeKnown` + 오늘 여부 → `{ text, bold: [시작, 끝][] }`. `SHARED_FEATURE_FILES` 에 더한다. 조사는 괄호 앞 말의 받침으로.
- 주는 것: 이유 문장 함수(나 탭 · 시기 · 오늘의 하늘)
- 하지 말 것: 문장을 서버나 AI 에서 받지 않는다. 이유: 054.
- 검증: 시안 문장 여섯(054 맥락)과 글자까지 같음, 시각 모름이면 하우스 부분이 빠짐, 모르는 kind 는 null(테스트 먼저)

#### 10. reason-line · 상태: 대기
- 읽을 것: 보드 12-1~12-3 · 11-5, sky-map 의 휠 · 팁 부품
- 할 것: `ReasonLine`(접힌 줄 · 누르면 그 자리에서 펼침: 작은 휠(그 근거의 별 · 칸만 빛남, TRANSIT 은 휠 없음) · 용어 줄 1~3 · `?` 말풍선 · "하늘 지도에서 보기" → `/chart` 에서 그 별을 고른 채로 — sky-map 이 고른 별을 받는 길이 없으면 쿼리 하나를 더한다). 공용 부품이 기능을 import 하지 않게 자리를 정한다(eslint).
- 검증: 펼침 · 접힘 · 말풍선 · 이동 테스트, 화면 읽기 이름

#### 11. making-view-shared · 상태: 대기(온보딩 v2 합친 뒤)
- 할 것: `MakingView` 를 공용 자리로 옮기고(작게 쓰는 크기 하나 더) 온보딩 · 나 탭 · 시기 · 오늘의 하늘이 함께 쓴다.
- 하지 말 것: 온보딩 v2 의 동작(별명 짓는 중)을 바꾸지 않는다. 이유: 옮기기만.
- 검증: 온보딩 테스트 그대로 통과

#### 12. reading-page · 상태: 대기
- 읽을 것: 결정 048 의 2 · 7, 보드 12(받은 뒤) · 12-1
- 할 것: `/reading` 을 내 별명 전체 페이지로(공유 아이콘 · 한 줄 별명 · 해 별자리 그림 · 셋 · 내 하늘 지도 보기 · 문단 + `ReasonLine` · 강점 3 · 보완점 2). 별명 공개(044)의 "풀이 읽기" 가 이리로 오는지 확인.
- 검증: 시각 앎/모름(첫인상 칸 · 문단 수) 렌더 테스트

#### 13. me-tab · 상태: 대기
- 읽을 것: 결정 048 · 050, 보드 12(받기 전) · 12-8~12-12 · 11-8 · 11-9
- 할 것: `/me` 와 `src/features/me/`(`use-me-report.ts` — 5초 확인 · 보관 `byeolmyeong.meReport.v1`). 받기 전 = 내 별명 내용 + "자세한 풀이" 카드, 받은 뒤 = 별명 카드 + 칩 다섯(`?area=`) + 영역 칸(glance · practices + reason · closer · workStyle 막대 · shaken) + 문단 + 쓰인 별. 쓰는 중(11-8 문구) · 실패(11-9 다시 쓰기) · 402 `PURCHASE_REQUIRED` 한 줄. 아래 탭 나 → `/me`.
- 하지 말 것: 막대에 숫자를 적지 않는다 · 값을 다시 셈하지 않는다. 이유: 048 의 3, 골든 룰.
- 검증: 상태 넷(NONE · WRITING · FAILED · DONE) · 칩 다섯 · 시각 모름 렌더 테스트, 폴링이 화면을 떠나면 멈춤

#### 14. remove-direction-report · 상태: 대기
- 할 것: 지울 목록을 먼저 출력하고(결정 048 결과 절: `src/app/direction.tsx` · `src/app/report.tsx` · `features/direction` 의 이성 · 미래 · `features/report/report-view.tsx` 등) 지운다. `strings.direction` 의 이성 · 미래 문구도 정리하고 궁합 방향성은 남긴다. 시기 로직(`timing.ts` · `timing-view.tsx` · `use-report.ts`)은 A③ 이 옮길 때까지 남긴다: A③ 이 아직 합쳐지지 않았으면 `src/app/timing.tsx` 임시 화면이 지금의 `timing-view` 를 그리고(옛 `GET /reports/me` 는 서버 S⑦ 까지 있다) 아래 탭 시기의 임시 대상을 `/timing` 으로 바꾼다.
- 하지 말 것: 파괴적 변경을 정리 커밋에 섞지 않는다. 이유: 골든 룰(제목에 "화면 제거" 명시).
- 검증: `npx tsc --noEmit && npx expo lint`, 지운 경로를 부르는 링크 없음(`grep -rn "/direction\b\|/report" src` 확인)

#### 15. docs-a2 · 상태: 대기
- 할 것: docs/release-1.0.0.md F3 · F4 · F10 · "화면" 표, docs/product.md 수익 모델(1.1.0 = 자세한 풀이 유료, 결정 050), CLAUDE.md 첫 문단 "1.1.0 부터 광고와 방향성 제시 유료화" → "광고와 자세한 풀이 유료화", docs/architecture.md(나 탭 · 이유 · `features/me` · `features/reason`).
- 검증: CLAUDE.md 80줄 이하, 지운 화면 이름이 문서에 없음

#### 16. verify-a2 · 상태: 대기
- 할 것: `/verify`, 스테이징 서버로 가입 → 별명 공개 → 풀이 읽기 → 나 탭 → 자세한 풀이 받기 → 성격 칩까지, 보드 12 · 12-8~12-12 와 나란히.

### A③ 시기 탭 + 홈 시기 칸 (서버 S③ · S④ 뒤)

#### 17. api-timing · 상태: 대기
- 할 것: 타입 · 검사 `MonthSky` · `TimingReport`(`mainId` · 구간 `summary` · `detail` · `practices` · `reason`) · `TimingReportState` · `DaySky`, `getMonth(month?)` · `requestTimingReport()` · `getTimingReport()` · `postDaySky(date?)`.
- 검증: 계약 표의 예 JSON 통과 · 틀린 것 거절(테스트 먼저)

#### 18. strings-timing · 상태: 대기
- 할 것: `strings.timing` 새로: 칩 셋 · 잠금 · 자세한 풀이 카드(시안 14 받기 전) · 이번 달 내내 · 눈여겨볼 날 · 0개 안내 · 카테고리(사람 · 일 · 마음) · 올해 · 인생(안내 문구) · 시기 자세히 01~03 · 그날의 하늘 · 쓰는 중/실패(시기 문구) · 429 안내 · 시각 모름 안내. "변곡점" → "큰 변화".
- 검증: 빈 값 없음(테스트)

#### 19. timing-feature · 상태: 대기
- 할 것: `src/features/timing/` 을 만들고 `report/timing.ts`(날짜 글자 도구)를 옮긴다. `use-timing-report.ts`(5초 확인 · 보관 `byeolmyeong.timingReport.v1` · 보관본 날짜가 오늘과 다르면 조용히 다시) · `use-month.ts`(달별, 보관 없음).
- 검증: 옮긴 도구의 테스트 그대로 통과

#### 20. month-view · 상태: 대기
- 읽을 것: 결정 049 의 2, 캔버스 14-1 · 14 받기 전
- 할 것: 달력(칸 배치는 달력 계산) · 점(`days`) · ‹ ›(첫 응답의 달 ±1 에서 멈춤) · 이번 달 내내 줄 · 눈여겨볼 날 목록 · 날짜를 누르면 그날의 하늘(범위 밖은 못 누름) · 시기 풀이 뒤 작은 실천.
- 검증: 지난달 · 다음 달 끝에서 화살표 막힘 · 0개 달 안내 · 범위 밖 날짜 못 누름(테스트)

#### 21. timing-tab · 상태: 대기
- 할 것: `/timing`(`?tab=month|year|life`) — 지금 나의 시기 카드(`mainId`), 칩 셋, 잠금 · 자세한 풀이 카드, `POST /timing-report` → 쓰는 중 → `DONE` 이면 올해 칩, 실패 다시 쓰기, 시각 모름 안내. 아래 탭 시기 → `/timing`.
- 검증: 시기 풀이 NONE · WRITING · FAILED · DONE 렌더, 잠긴 칩 누름(테스트)

#### 22. year-life-views · 상태: 대기
- 할 것: 올해(띠 그래프 영역 넷 — 날짜 글자 비교로 거름, 시각 모름이면 돈 줄 없음 · 지금 지나는 중 · 다가오는 시기 3 · 작은 실천), 인생(안내 · 다음 큰 변화 카드 · 큰 변화 네 줄의 길 · 작은 실천).
- 하지 말 것: 해 · 나이를 셈하지 않는다. 이유: 서버 `year` · `age` 그대로(골든 룰).
- 검증: 시각 앎/모름 · 대표 구간 없음 렌더 테스트

#### 23. period-day-screens · 상태: 대기
- 할 것: `/timing/period?id=`(시기 자세히, `detail` 이 있는 구간만), `/timing/day?date=`(그날의 하늘 — `POST /day-sky`, 쓰는 중 · 못 썼을 때 · 429 한 줄, 오늘 날짜는 A④ 전까지 이 화면 · A④ 뒤 `/today`).
- 검증: 쓰는 중 → 글, 실패 → 다시 쓰기, 429 안내(테스트)

#### 24. home-timing-card · 상태: 대기
- 할 것: 홈에 지금 나의 시기 카드(지나온 · 지금 · 다음 큰 변화의 해 줄, 대표 구간 이름 · "○○○○년 ○월까지") · 이 시기의 작은 실천 3 · 시기 풀이 없으면 "자세한 풀이 받기" 카드 · 쓰는 중이면 칸 없음(결정 047 의 1-4 · 1-5).
- 검증: 시기 풀이 상태별 홈 렌더 테스트

#### 25. docs-a3 · verify-a3 · 상태: 대기
- 할 것: docs/release-1.0.0.md F4 · "화면" 표, docs/architecture.md(`features/timing`). `/verify` + 캔버스 14 보드 8개와 나란히 스크린샷(공유 14-5 · 14-6 은 A⑤).

### A④ 오늘의 하늘 + 알림함 (서버 S④ · S⑤ 뒤)

#### 26. api-notifications · strings · 상태: 대기
- 할 것: `getNotifications()` · `markNotificationRead(id)` 타입 · 검사, `strings.today` · `strings.notifications`(종류 넷 문구 · 묶음 이름 · 빈 안내).
- 검증: 모르는 `kind` 줄은 숨김(테스트)

#### 27. today-screen · home-today-card · 상태: 대기
- 읽을 것: 결정 051, 보드 11 · 11-4 · 11-5
- 할 것: `/today`(날짜 · 요일 · 제목 · 오늘의 흐름 셋 · `ReasonLine`(TRANSIT, 휠 없음) · 작은 실천 3 · 공유 자리), 홈 오늘의 하늘 카드(`POST /day-sky` 날짜 없이, 보관 `byeolmyeong.daySky.v1`, 쓰는 중 작은 `MakingView` · 실패 다시 쓰기). 달력의 오늘 → `/today`.
- 검증: 보관본 먼저 그림 · 날이 바뀌면 다시 부름 · 쓰는 중/실패(테스트)

#### 28. notifications-screen · home-bell · 상태: 대기
- 읽을 것: 결정 052, 보드 11-3
- 할 것: `/notifications`(오늘 · 최근 7일 · 최근 30일 묶음, 안 읽음 점, 누르면 읽음 + 이동 — 읽음 실패해도 이동), 홈 종(안 읽음 1 이상이면 점, 홈을 열 때 · 알림함에서 돌아올 때 다시 물음).
- 검증: 묶음 경계(한국 날짜) · 이동 대상 넷 · 점 표시(테스트)

#### 29. docs-a4 · verify-a4 · 상태: 대기
- 할 것: docs/product.md 44 · 67줄과 docs/release-1.0.0.md 196줄 · "화면" 표를 결정 051 에 맞춰 고친다(오늘의 하늘 1.0.0, 매주 글 · 알림은 그대로 뒤). `/verify` + 보드 11 · 11-3 · 11-4 · 11-5 와 나란히.

### A⑤ 공유 v2 (서버 S⑥ · Meta 앱 ID · 새 개발 빌드 뒤)

#### 30. bring-story-plan · 상태: 대기
- 할 것: `origin/docs/instagram-story-share` 의 계획 태스크 2~8(strings-share · story-module-spike · share-card · share-sheet-app · save-to-photos · share-sheet-web · verify)을 이 묶음으로 가져온다. 그 계획의 태스크 1(결정)은 053 이 맡으므로 하지 않는다. 그 브랜치 계획 파일 앞머리에 "053 이 결정, 실행은 home-me-timing A⑤" 한 줄.
- 검증: 가져온 태스크가 이 계획 실행 기록에 대응표로 있음

#### 31. api-share-kinds · share-cards-v2 · 상태: 대기
- 할 것: `ShareCard` · `ShareRequest` 에 `NICKNAME` · `ME_AREA` · `DAY_SKY` · `NEXT_BIG`, 카드 넷(9:16, 결정 053 의 2 — 해 별자리 · 영역 · 달 그림은 `card` 값에 맞춰 브랜드 그림에서), 공유 아이콘 자리(내 별명 · 칩 다섯 · 오늘의/그날의 하늘 · 다음 큰 변화)에서 시트를 열 때 `POST /shares` 한 번.
- 하지 말 것: 출생 정보 · 근거 · 본문 · 하우스를 카드에 넣지 않는다. 이유: 053 의 4.
- 검증: 카드 넷 렌더 테스트, 시트가 서버를 한 번만 부름

#### 32. verify-a5 · 상태: 대기
- 할 것: `/verify` + 실제 기기 표(iPhone · Android × 인스타그램 있음/없음 × 저장 권한 허용/거절, 웹 — iPhone 사파리 · Android 크롬 · 컴퓨터 크롬), 시안 12-4~12-7 · 12-13 · 12-14 · 11-6 · 11-7 · 14-5 · 14-6 과 나란히.

## 검증 (묶음마다)
- `npx tsc --noEmit && npx expo lint && npm test` 통과, `/verify` 표 전부 통과, 그 묶음 보드와 나란히 스크린샷.
- 전체 흐름(웹, 스테이징): 가입 → 별명 공개 → 나 탭(받기 전) → 자세한 풀이 → 시기 탭(이번 달) → 날짜 → 그날의 하늘 → 시기 풀이 → 홈(시기 카드 · 오늘의 하늘 · 종) → 알림함.

## 리뷰 초점
1. 시각 "모름" 계정에서 하우스 · 상승점 · 중천 · 한 하우스에 모임 · 돈 · 운명적 만남이 어느 화면(이유 펼침 · 쓰인 별 · 올해 띠 · 공유 카드)에도 없는가 — 태스크 9 · 13 · 22 · 31.
2. 앱이 점성 계산을 하지 않는가: 막대 · 해 · 나이 · 점 · 대표 구간을 셈하는 코드가 없는가 — 태스크 13 · 20 · 22.
3. 폴링(나 탭 · 시기 풀이)이 화면을 떠나면 멈추고, 같은 요청을 겹쳐 보내지 않는가 — 태스크 13 · 21.
4. 그날의 하늘을 빠르게 넘길 때 429 가 화면을 깨지 않는가 — 태스크 23.
5. 옛 보관본(`reason` 없는 요약 해석 · 옛 심층 리포트)이 화면을 깨지 않고 다시 받기로 이어지는가 — 태스크 7 · 13.

## 위험 · 되돌리기
- 서버 묶음보다 앱 묶음이 먼저 나가면 없는 경로를 부른다 → 배포 순서 표를 지키고, 앱은 404 를 "그 칸 숨김" 으로 다룬다(홈 칸).
- S⑦(옛 경로 제거) 전에 옛 테스트앱이 남아 있으면 깨진다 → 새 테스트앱 빌드가 TestFlight 에 나간 뒤에만 S⑦.
- `feat/sky-map` · 온보딩 v2 가 늦어지면 A② 가 막힌다 → A① · A③ · A④ 를 먼저 할 수 있다(A③ 의 이유 줄은 A② 의 태스크 9 · 10 이 필요하다 — A② 보다 먼저 하면 이유 줄 자리만 두고 A② 에서 채운다).
- 되돌리기: 묶음마다 브랜치 · PR 이 따로라 PR 하나를 되돌리면 그 묶음만 빠진다. A② 의 화면 제거(태스크 14)는 별도 커밋이다.

## 열린 항목
- **소유자 질문**(기본값으로 진행, 코디네이터가 묻는다):
  1. 다음 큰 변화 공유 카드의 "2028년 · 만 29세 무렵" 으로 태어난 해를 한 해 안팎으로 알 수 있다 → 기본값: 시안대로 둔다(053 · 서버 036).
  2. 시기 이름을 문구표(서버 표 제목) 하나로 맞춰 시기 풀이 뒤에도 AI 가 이름을 바꾸지 않게 → 기본값: 그렇게 한다(049 · 서버 033).
  3. 시기 자세히를 시기 풀이 때 한꺼번에 만들까, 열 때마다 → 기본값: 한꺼번에(서버 033).
  4. 그날의 하늘도 생성 한도(분당 5 · 시간당 30)를 같이 써서 날짜를 빨리 넘기면 429 → 기본값: 그대로(049 · 서버 034).
- **시안에 없는 화면 다섯**(원본 9번 끝 — 디자인 필요, 그 전에는 기본값): ① 그날의 하늘 · 쓰는 중 ② 그날의 하늘 · 못 썼을 때(다시 쓰기) ③ 홈 오늘의 하늘 카드 · 쓰는 중 ④ 시기 풀이 · 쓰는 중 / 못 썼을 때(지금 11-8 · 11-9 는 나 탭 문구) ⑤ 시기 · 올해 / 인생 잠긴 칩을 눌렀을 때. 기본값: ①~④ 는 `MakingView` 와 11-8 · 11-9 모양, ⑤ 는 자세한 풀이 카드로 굴림. 그 밖에 시안이 없는 것: 눈여겨볼 날 0개 · 알림함 빈 상태 · 대표 구간 없음.
- **궁합 보류**: 궁합 탭 새 모양 · 홈 궁합 랭킹 · 연애 TOP3 · 궁합 공유 카드 — 궁합 시안이 나오면 새 결정(046 의 3 · 047 의 1-6 · 053 의 6).
- **문서 고칠 때**: product · release-1.0.0 · CLAUDE.md 는 묶음 PR 에서(태스크 4 · 15 · 25 · 29).
- **044 · 045 앞머리**: 온보딩 v2 가 develop 에 합쳐진 뒤(태스크 6).
- **Meta 앱 ID**(`EXPO_PUBLIC_META_APP_ID`): 소유자가 만든다. 없으면 스토리 버튼이 숨는다(A⑤).
- **서버 초안 검토**(소유자): 서버 저장소 `docs/drafts/2026-11-20-month-phrases.md`(이번 달 문구표) · `docs/drafts/2026-11-20-work-style-formula.md`(일 방식 공식).
- **개인정보 수집 · 이용 동의 글**: 온보딩 v2 에서 처리.

## 실행 기록
- 2026-11-20 계획 · 결정 046~054 작성(문서만). 처음 045 · 046 으로 쓴 결정을 온보딩 v2 의 045 때문에 046 · 047 로 옮김.

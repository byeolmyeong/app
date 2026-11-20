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

#### 1. strings-tabs-home · 상태: 완료
- 읽을 것: 결정 046 · 047, 보드 11 · 11-1, `src/content/strings.ts` 의 `tabs` · `home`
- 할 것: `strings.tabs` 넷(홈 · 나 · 시기 · 마이 — 결정 055), `strings.home` 의 별명 카드("○○ 님" · "별명을 받은 지 ○일" · 풀이 읽기). 쓰지 않게 되는 홈 카테고리 문구는 지운다.
- 주는 것: 문구 키
- 하지 말 것: 화면 파일에 문구를 쓰지 않는다.
- 검증: `npm test -- strings` 통과, 새 키에 빈 값 없음(테스트)

#### 2. bottom-tabs-five · 상태: 완료
- 읽을 것: `src/features/home/main-tabs.tsx` · `src/components/bottom-tabs.tsx` · 그 테스트
- 할 것: `MainTab = 'home' | 'me' | 'timing' | 'my'`, 네 칸 · 시안 아이콘, 누르면 `router.replace`. 나 → `/reading`, 시기 → `/report?area=TIMING`(임시 대상은 한 곳의 표). 아래 탭을 그리는 화면: 홈 · 마이 · `/reading` · `/report`. `/synastry` 로 들어오면 홈으로(결정 055 의 1).
- 주는 것: 네 칸 탭
- 하지 말 것: Expo Router `Tabs` 로 바꾸지 않는다. 이유: 결정 046 의 2.
- 검증: 탭 넷이 보이고 누르면 그 경로로 바뀌며 뒤로 가기에 쌓이지 않는다(테스트)

#### 3. home-v2 · 상태: 완료
- 읽을 것: 결정 047, 보드 11 · 11-1, `home-categories.tsx` · `home-reading-card.tsx`, `src/app/index.tsx`
- 할 것: 홈을 머리(로고) · 별명 카드(프로필 `GET /account` 의 `avatar` · 닉네임 · 해 별자리(차트 SUN 의 `sign`) · "별명을 받은 지 ○일"(`Reading.createdAt` 이 있을 때만 — 한국 날짜 차이, 받은 날 1일) · 한 줄 별명 · 풀이 읽기 → `/reading`)로. 관계 · 궁합 칸과 `home-categories.tsx` 를 지운다. 출생 정보가 없을 때의 흐름(결정 029)은 그대로.
- 주는 것: 홈 v2 뼈대(A③ · A④ 가 칸을 더한다)
- 하지 말 것: 해 별자리를 날짜로 셈하지 않는다. 이유: 골든 룰(서버 차트 값).
- 검증: `createdAt` 있음/없음 · 시각 모름 각각의 홈 렌더 테스트, 지운 파일을 가리키는 import 없음(`npx tsc --noEmit`)

#### 4. docs-a1 · 상태: 완료
- 할 것: docs/release-1.0.0.md "화면" 표(아래 탭 넷 · 홈), docs/architecture.md 디렉터리 설명(홈).
- 검증: 지운 화면 이름이 문서에 남지 않음(`grep -n home-categories docs` 비어 있음)

#### 5. verify-a1 · 상태: 완료
- 할 것: `/verify`, 웹에서 홈 → 탭 넷 → 홈 왕복, 보드 11-1 과 나란히 스크린샷.
- 검증: 표 전부 통과

### A② 나 탭 + 나 탭 풀이 + 이유 펼침 (서버 S① · S②, `feat/sky-map` · 온보딩 v2 합친 뒤)

#### 6. adr-044-045-marks · 상태: 완료
- 할 것: 044 앞머리 `superseded_by` 에 "048-me-tab-and-me-report.md (4 의 "풀이 읽기 → 지금의 풀이 글" 만 → 내 별명)". 045(개인정보 수집 · 이용 동의 글)는 이 계획의 결정과 겹치는 데가 없는지 읽고, 없으면 표시하지 않고 실행 기록에 "확인함" 만 남긴다. 번호가 다시 밀렸으면(develop 에 046~054 가 이미 있으면) 이 계획 · 결정의 번호를 먼저 맞춘다.
- 하지 말 것: 044 · 045 본문을 고치지 않는다. 이유: 대체 표시만(골든 룰).
- 검증: `ls docs/decisions | cut -c1-3 | sort | uniq -d` 비어 있음

#### 7. api-me-reason · 상태: 완료
- 읽을 것: 서버 계획 "계약 표"(`Reading` · `MeReport` · `BasisItem` · `Reason` · `Star`), `src/lib/api.ts` 의 `isReading` · `isReport`
- 할 것: 타입 `BasisItem` · `Reason` · `Star` · `MeArea` · `MeReport` · `MeReportState`, 검사 함수 `isReason` · `isMeReport`, `requestMeReport()` · `getMeReport()`. `Reading` 에 `reason` · `createdAt`, `cautions` 2개, `isReading` 은 `reason` 이 없으면 거절(옛 보관본은 다시 받게 — 048 의 8).
- 주는 것: 나 탭 · 이유 줄의 타입
- 하지 말 것: 모르는 `kind` 때문에 풀이 전체를 거절하지 않는다. 이유: 그 줄만 숨긴다(054 의 7).
- 검증: 계약 표의 예 JSON 통과 · 필드 빠짐/타입 틀림 거절 테스트(먼저 실패를 본다)

#### 8. glossary-reason · 상태: 완료
- 읽을 것: `strings.glossary`(sky-map), 결정 054 의 3, 시안 근거 줄 전부(보드 12 · 12-8~12-12 · 11-5 · 14-3 · 14-4)
- 할 것: 별자리 `adjective`(12), 별 `reasonName` · `transitName`(10 — 시안에 있는 말: 달 "마음" · "마음을 비추는 별", 토성 "책임을 맡은 별", 수성 "말을 맡은 별", 금성 "좋아하는 것", 나머지는 `nickname`), 각도 `reasonPhrase` · 이름(합 · 육분 · 사분 · 삼분 · 충), 별 수 말(셋 · 넷 · 다섯 …). 채운 말 목록을 실행 기록에.
- 하지 말 것: sky-map 의 기존 키 이름을 바꾸지 않는다. 이유: 하늘 지도 화면이 쓴다.
- 검증: 별자리 12 · 별 10 · 각도 5 의 새 값이 빈 값 없이 모두 있음(테스트)

#### 9. reason-sentence · 상태: 완료
- 읽을 것: 결정 054 의 2 · 6 · 7
- 할 것: `src/features/reason/reason-sentence.ts` — `Reason` + 차트의 `timeKnown` + 오늘 여부 → `{ text, bold: [시작, 끝][] }`. `SHARED_FEATURE_FILES` 에 더한다. 조사는 괄호 앞 말의 받침으로.
- 주는 것: 이유 문장 함수(나 탭 · 시기 · 오늘의 하늘)
- 하지 말 것: 문장을 서버나 AI 에서 받지 않는다. 이유: 054.
- 검증: 시안 문장 여섯(054 맥락)과 글자까지 같음, 시각 모름이면 하우스 부분이 빠짐, 모르는 kind 는 null(테스트 먼저)

#### 10. reason-line · 상태: 완료
- 읽을 것: 보드 12-1~12-3 · 11-5, sky-map 의 휠 · 팁 부품
- 할 것: `ReasonLine`(접힌 줄 · 누르면 그 자리에서 펼침: 작은 휠(그 근거의 별 · 칸만 빛남, TRANSIT 은 휠 없음) · 용어 줄 1~3 · `?` 말풍선 · "하늘 지도에서 보기" → `/chart` 에서 그 별을 고른 채로 — sky-map 이 고른 별을 받는 길이 없으면 쿼리 하나를 더한다). 공용 부품이 기능을 import 하지 않게 자리를 정한다(eslint).
- 검증: 펼침 · 접힘 · 말풍선 · 이동 테스트, 화면 읽기 이름

#### 11. making-view-shared · 상태: 완료(작게 쓰는 크기는 쓰는 곳이 생길 때 — 실행 기록)
- 할 것: `MakingView` 를 공용 자리로 옮기고(작게 쓰는 크기 하나 더) 온보딩 · 나 탭 · 시기 · 오늘의 하늘이 함께 쓴다.
- 하지 말 것: 온보딩 v2 의 동작(별명 짓는 중)을 바꾸지 않는다. 이유: 옮기기만.
- 검증: 온보딩 테스트 그대로 통과

#### 12. reading-page · 상태: 완료
- 읽을 것: 결정 048 의 2 · 7, 보드 12(받은 뒤) · 12-1
- 할 것: `/reading` 을 내 별명 전체 페이지로(공유 아이콘 · 한 줄 별명 · 해 별자리 그림 · 셋 · 내 하늘 지도 보기 · 문단 + `ReasonLine` · 강점 3 · 보완점 2). 별명 공개(044)의 "풀이 읽기" 가 이리로 오는지 확인.
- 검증: 시각 앎/모름(첫인상 칸 · 문단 수) 렌더 테스트

#### 13. me-tab · 상태: 완료
- 읽을 것: 결정 048 · 050, 보드 12(받기 전) · 12-8~12-12 · 11-8 · 11-9
- 할 것: `/me` 와 `src/features/me/`(`use-me-report.ts` — 5초 확인 · 보관 `byeolmyeong.meReport.v1`). 받기 전 = 내 별명 내용 + "자세한 풀이" 카드, 받은 뒤 = 별명 카드 + 칩 다섯(`?area=`) + 영역 칸(glance · practices + reason · closer · workStyle 막대 · shaken) + 문단 + 쓰인 별. 쓰는 중(11-8 문구) · 실패(11-9 다시 쓰기) · 402 `PURCHASE_REQUIRED` 한 줄. 아래 탭 나 → `/me`.
- 하지 말 것: 막대에 숫자를 적지 않는다 · 값을 다시 셈하지 않는다. 이유: 048 의 3, 골든 룰.
- 검증: 상태 넷(NONE · WRITING · FAILED · DONE) · 칩 다섯 · 시각 모름 렌더 테스트, 폴링이 화면을 떠나면 멈춤

#### 14. remove-direction-report · 상태: 완료
- 할 것: 지울 목록을 먼저 출력하고(결정 048 결과 절: `src/app/direction.tsx` · `src/app/report.tsx` · `features/direction` 의 이성 · 미래 · `features/report/report-view.tsx` 등) 지운다. `strings.direction` 의 이성 · 미래 문구도 정리하고 궁합 방향성은 남긴다. 시기 로직(`timing.ts` · `timing-view.tsx` · `use-report.ts`)은 A③ 이 옮길 때까지 남긴다: A③ 이 아직 합쳐지지 않았으면 `src/app/timing.tsx` 임시 화면이 지금의 `timing-view` 를 그리고(옛 `GET /reports/me` 는 서버 S⑦ 까지 있다) 아래 탭 시기의 임시 대상을 `/timing` 으로 바꾼다.
- 하지 말 것: 파괴적 변경을 정리 커밋에 섞지 않는다. 이유: 골든 룰(제목에 "화면 제거" 명시).
- 검증: `npx tsc --noEmit && npx expo lint`, 지운 경로를 부르는 링크 없음(`grep -rn "/direction\b\|/report" src` 확인)

#### 15. docs-a2 · 상태: 완료
- 할 것: docs/release-1.0.0.md F3 · F4 · F10 · "화면" 표, docs/product.md 수익 모델(1.1.0 = 자세한 풀이 유료, 결정 050), CLAUDE.md 첫 문단 "1.1.0 부터 광고와 방향성 제시 유료화" → "광고와 자세한 풀이 유료화", docs/architecture.md(나 탭 · 이유 · `features/me` · `features/reason`).
- 검증: CLAUDE.md 80줄 이하, 지운 화면 이름이 문서에 없음

#### 16. verify-a2 · 상태: 완료(웹 390 모의 서버 — 스테이징 흐름은 S② 스테이징 뒤 소유자 쪽)
- 할 것: `/verify`, 스테이징 서버로 가입 → 별명 공개 → 풀이 읽기 → 나 탭 → 자세한 풀이 받기 → 성격 칩까지, 보드 12 · 12-8~12-12 와 나란히.

### A③ 시기 탭 + 홈 시기 칸 (서버 S③ · S④ 뒤)

#### 17. api-timing · 상태: 완료
- 할 것: 타입 · 검사 `MonthSky` · `TimingReport`(`mainId` · 구간 `summary` · `detail` · `practices` · `reason`) · `TimingReportState` · `DaySky`, `getMonth(month?)` · `requestTimingReport()` · `getTimingReport()` · `postDaySky(date?)`.
- 검증: 계약 표의 예 JSON 통과 · 틀린 것 거절(테스트 먼저)

#### 18. strings-timing · 상태: 완료
- 할 것: `strings.timing` 새로: 칩 셋 · 잠금 · 자세한 풀이 카드(시안 14 받기 전) · 이번 달 내내 · 눈여겨볼 날 · 0개 안내 · 카테고리(사람 · 일 · 마음) · 올해 · 인생(안내 문구) · 시기 자세히 01~03 · 그날의 하늘 · 쓰는 중/실패(시기 문구) · 429 안내 · 시각 모름 안내. "변곡점" → "큰 변화".
- 검증: 빈 값 없음(테스트)

#### 19. timing-feature · 상태: 완료
- 할 것: `src/features/timing/` 을 만들고 `report/timing.ts`(날짜 글자 도구)를 옮긴다. `use-timing-report.ts`(5초 확인 · 보관 `byeolmyeong.timingReport.v1` · 보관본 날짜가 오늘과 다르면 조용히 다시) · `use-month.ts`(달별, 보관 없음).
- 검증: 옮긴 도구의 테스트 그대로 통과

#### 20. month-view · 상태: 완료
- 읽을 것: 결정 049 의 2, 캔버스 14-1 · 14 받기 전
- 할 것: 달력(칸 배치는 달력 계산) · 점(`days`) · ‹ ›(첫 응답의 달 ±1 에서 멈춤) · 이번 달 내내 줄 · 눈여겨볼 날 목록 · 날짜를 누르면 그날의 하늘(범위 밖은 못 누름) · 시기 풀이 뒤 작은 실천.
- 검증: 지난달 · 다음 달 끝에서 화살표 막힘 · 0개 달 안내 · 범위 밖 날짜 못 누름(테스트)

#### 21. timing-tab · 상태: 완료
- 할 것: `/timing`(`?tab=month|year|life`) — 지금 나의 시기 카드(`mainId`), 칩 셋, 잠금 · 자세한 풀이 카드, `POST /timing-report` → 쓰는 중 → `DONE` 이면 올해 칩, 실패 다시 쓰기, 시각 모름 안내. 아래 탭 시기 → `/timing`.
- 검증: 시기 풀이 NONE · WRITING · FAILED · DONE 렌더, 잠긴 칩 누름(테스트)

#### 22. year-life-views · 상태: 완료
- 할 것: 올해(띠 그래프 영역 넷 — 날짜 글자 비교로 거름, 시각 모름이면 돈 줄 없음 · 지금 지나는 중 · 다가오는 시기 3 · 작은 실천), 인생(안내 · 다음 큰 변화 카드 · 큰 변화 네 줄의 길 · 작은 실천).
- 하지 말 것: 해 · 나이를 셈하지 않는다. 이유: 서버 `year` · `age` 그대로(골든 룰).
- 검증: 시각 앎/모름 · 대표 구간 없음 렌더 테스트

#### 23. period-day-screens · 상태: 완료
- 할 것: `/timing/period?id=`(시기 자세히, `detail` 이 있는 구간만), `/timing/day?date=`(그날의 하늘 — `POST /day-sky`, 쓰는 중 · 못 썼을 때 · 429 한 줄, 오늘 날짜는 A④ 전까지 이 화면 · A④ 뒤 `/today`).
- 검증: 쓰는 중 → 글, 실패 → 다시 쓰기, 429 안내(테스트)

#### 24. home-timing-card · 상태: 완료
- 할 것: 홈에 지금 나의 시기 카드(지나온 · 지금 · 다음 큰 변화의 해 줄, 대표 구간 이름 · "○○○○년 ○월까지") · 이 시기의 작은 실천 3 · 시기 풀이 없으면 "자세한 풀이 받기" 카드 · 쓰는 중이면 칸 없음(결정 047 의 1-4 · 1-5).
- 검증: 시기 풀이 상태별 홈 렌더 테스트

#### 25. docs-a3 · verify-a3 · 상태: 완료(웹 390 모의 서버 — 스테이징 흐름은 S③ · S④ 스테이징 뒤 소유자 쪽)
- 할 것: docs/release-1.0.0.md F4 · "화면" 표, docs/architecture.md(`features/timing`). `/verify` + 캔버스 14 보드 8개와 나란히 스크린샷(공유 14-5 · 14-6 은 A⑤).

### A④ 오늘의 하늘 + 알림함 (서버 S④ · S⑤ 뒤)

#### 26. api-notifications · strings · 상태: 완료(A④)
- 할 것: `getNotifications()` · `markNotificationRead(id)` 타입 · 검사, `strings.today` · `strings.notifications`(종류 넷 문구 · 묶음 이름 · 빈 안내).
- 검증: 모르는 `kind` 줄은 숨김(테스트)

#### 27. today-screen · home-today-card · 상태: 완료(A④)
- 읽을 것: 결정 051, 보드 11 · 11-4 · 11-5
- 할 것: `/today`(날짜 · 요일 · 제목 · 오늘의 흐름 셋 · `ReasonLine`(TRANSIT, 휠 없음) · 작은 실천 3 · 공유 자리), 홈 오늘의 하늘 카드(`POST /day-sky` 날짜 없이, 보관 `byeolmyeong.daySky.v1`, 쓰는 중 작은 `MakingView` · 실패 다시 쓰기). 달력의 오늘 → `/today`.
- 검증: 보관본 먼저 그림 · 날이 바뀌면 다시 부름 · 쓰는 중/실패(테스트)

#### 28. notifications-screen · home-bell · 상태: 완료(A④)
- 읽을 것: 결정 052, 보드 11-3
- 할 것: `/notifications`(오늘 · 최근 7일 · 최근 30일 묶음, 안 읽음 점, 누르면 읽음 + 이동 — 읽음 실패해도 이동), 홈 종(안 읽음 1 이상이면 점, 홈을 열 때 · 알림함에서 돌아올 때 다시 물음).
- 검증: 묶음 경계(한국 날짜) · 이동 대상 넷 · 점 표시(테스트)

#### 29. docs-a4 · verify-a4 · 상태: 완료(A④)
- 할 것: docs/product.md 44 · 67줄과 docs/release-1.0.0.md 196줄 · "화면" 표를 결정 051 에 맞춰 고친다(오늘의 하늘 1.0.0, 매주 글 · 알림은 그대로 뒤). `/verify` + 보드 11 · 11-3 · 11-4 · 11-5 와 나란히.

### A⑤ 공유 v2 (서버 S⑥ · Meta 앱 ID · 새 개발 빌드 뒤)

#### 30. bring-story-plan · 상태: 완료(대응표는 실행 기록 A⑤)
- 할 것: `origin/docs/instagram-story-share` 의 계획 태스크 2~8(strings-share · story-module-spike · share-card · share-sheet-app · save-to-photos · share-sheet-web · verify)을 이 묶음으로 가져온다. 그 계획의 태스크 1(결정)은 053 이 맡으므로 하지 않는다. 그 브랜치 계획 파일 앞머리에 "053 이 결정, 실행은 home-me-timing A⑤" 한 줄.
- 검증: 가져온 태스크가 이 계획 실행 기록에 대응표로 있음

#### 31. api-share-kinds · share-cards-v2 · 상태: 완료(오늘의 하늘 아이콘은 A④)
- 할 것: `ShareCard` · `ShareRequest` 에 `NICKNAME` · `ME_AREA` · `DAY_SKY` · `NEXT_BIG`, 카드 넷(9:16, 결정 053 의 2 — 해 별자리 · 영역 · 달 그림은 `card` 값에 맞춰 브랜드 그림에서), 공유 아이콘 자리(내 별명 · 칩 다섯 · 오늘의/그날의 하늘 · 다음 큰 변화)에서 시트를 열 때 `POST /shares` 한 번.
- 하지 말 것: 출생 정보 · 근거 · 본문 · 하우스를 카드에 넣지 않는다. 이유: 053 의 4.
- 검증: 카드 넷 렌더 테스트, 시트가 서버를 한 번만 부름

#### 32. verify-a5 · 상태: 진행(코드 · 시험 · 웹 끝 — 기기 표는 새 테스트앱에서)
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
- 2026-11-20 묶음 A①(세션 fa, 워크트리 `.wt-app-a1`, 브랜치 `feat/tabs-home-v2`, develop `70c1a78` 위). 상위 계획 `docs/plans/2026-11-20-sian-all-repos.md` 의 "바뀌는 줄"(탭 넷 · 궁합 없음)을 따름. 시작: 81 묶음 1030 통과.
  - 태스크 1: `strings.tabs` 넷(홈 · 나 · 시기 · 마이) · `strings.home.card`(" 님" · "별명을 받은 지 N일" · 풀이 읽기). 확인: `home-strings.test` 2 먼저 실패 → 통과. 커밋 66fef9b
  - 태스크 2: `MainTab` 넷 · 가는 곳 표(나 → `/reading`, 시기 → `/report?area=TIMING`, 결정 046 의 4) · 시안 아이콘(네 갈래 별 · 달). 아래 탭: 홈 · 마이 · 요약 해석 글 · 리포트 글(시기 영역이면 시기). `src/app/synastry/_layout.tsx` 가 `/synastry/**` 를 홈으로(궁합 코드는 남김, 결정 055 의 1 · 리뷰 초점 5). 리포트는 영역 탭(`Tabs`)과 아래 탭(`BottomTabs`)이 둘이라 고정 testID 로 가름. 확인: 새 테스트 4 먼저 실패(탭 넷 · 요약 해석 · 리포트 · 궁합 주소) → 통과. 커밋 7a7ed75
  - 태스크 3: `api.getAccount`(닉네임 · 프로필만, 1~8 검사) · `Reading.createdAt`(있으면 글자). 홈 v2 = 머리 + `NicknameCard`(보드 11: 프로필 52 · "새벽별 님" 18/26 · "쌍둥이자리 · 별명을 받은 지 N일" 13/18 · 한 줄 별명 21/30 `cardTitle` · 풀이 읽기, 오른쪽 위 빛 `GlowBackdrop` 에 `centerX` · 별자리 장식). 해 별자리는 서버 차트 SUN, N일은 한국 날짜로 받은 날 1일(`days-since`). 계정을 못 받으면 이름 줄 없이, 만든 때가 없으면 해 별자리만, 풀이가 없으면 "아직 별명을 짓지 않았어요 · 내 별명 읽기". `home-categories` · `home-reading-card` 와 그 문구 · 값을 지움. 확인: api 4 · days-since 3 · 홈 7 먼저 실패 → 통과(옛 홈의 핵심 셋에도 "쌍둥이자리" 가 있어 카드 안에서만 찾게 좁힘). 커밋 20c5288 · 09c4cef. 탭 이름 11/15(600 · 500) 63591eb
  - 태스크 4: release 화면 표(홈 v2 · 아래 탭 넷 · 궁합 시작 1.0.0 에서 안 열림) · architecture(home/ · synastry/_layout) · DESIGN.md(브랜드 자리 · 탭 아이콘), 상위 계획 P3 · P4 완료. 커밋 f6ef748
  - 태스크 5: 웹 390(모의 API · 개발 서버 8118 — 찍고 끔)에서 보드 11-1(피그마 169:2)과 나란히. 고친 것 둘: ① 기기에 받아 둔 글을 그리는 갈래에 아래 탭이 없었다(단위 테스트는 서버 갈래만 쳤음 — 테스트에 받아 둔 글 갈래를 더해 먼저 실패 확인) a3c4be1 · ② 머리가 48 이라 카드가 20 위에 있었다 → `NavBar tall`(56) · 카드 위 12 437df25. 고친 뒤 카드 위 끝 y 69 로 보드와 같음, 머리 칸 채널 차 > 24 픽셀 0.98% · 카드 칸 11.74%(글자 테두리 · 의도한 차이 — 해 별자리 이름 · 프로필 그림 번호, 빛 · 장식 자리는 차이 없음). 탭 왕복: 홈 → 나 `/reading` → 시기 `/report?area=TIMING`(시기 탭 골라짐) → 마이 → 홈, 브라우저 기록 길이 2(쌓이지 않음), `/synastry` 를 열면 홈. 가로 넘침 0. 알림 종은 서버 S⑤ 뒤에 연다(결정 047 의 3).
  - 확인: `npx tsc --noEmit && npx expo lint` exit 0 · `npm test` 82 묶음 1031 통과 · `npx expo export --platform web` exit 0 · `npx expo-doctor` 20/20.
  - 독립 리뷰(깨끗한 맥락, `reviewer` 지침 · diff 와 기준만): 차단 1 · 수정 3 · 제안 5. 고침 — ① 홈이 세션 확인 전에 `GET /account` 를 불러, 앱에서 토큰을 읽기 전이면 401 → 세션 다시 받기가 보관 토큰을 지웠다(다음 실행에 로그아웃) → 로그인이 확인된 뒤에만 f74e59b · ② 탭이 replace 만 해 push 로 들어온 글에서 누르면 밑의 화면이 남았다(홈 둘 · 뒤로 가면 출생 정보) → `dismissAll` 뒤 replace, 실제 라우터 테스트 7c8b831 · ③ 리포트는 다 쓴 글에만, 요약 해석은 실패에 아래 탭이 없었다 → 시기 · 나 탭 자리의 모든 갈래에 · ④ 리포트의 두 탭 줄이 화면 읽기에서 구분되지 않고 영역을 바꿔도 아래 탭이 그대로 → "리포트 영역" · "아래 탭" 이름, 영역을 따라감 b1076e9 · ⑤ 궁합 주소 테스트를 실제 라우터로(하위 주소 다섯) 52ac731 · ⑦ 모르는 프로필 번호면 계정 전체를 버리던 것 → 닉네임은 받고 그림만 숨김 f63fcb8 · ⑧ 궁합 화면 표 네 행 · 없는 invite 경로 · 쓰지 않는 문구 481502e. 새 테스트는 고치기 전에 먼저 실패함을 봄(궁합 주소 다섯은 이미 맞는 동작이라 통과 — 약한 테스트를 바꾼 것). 그대로 둔 것 — ⑥ `GlowShape` · `ChartPicture named=false` 는 공용 부품 · 부품 테스트가 있어 남김 · ⑨ 홈을 띄운 채 자정을 넘기면 "N일" 이 하루 늦음(홈 탭을 다시 누르면 맞음).
  - 확인(리뷰 고침 뒤): `npx tsc --noEmit && npx expo lint` exit 0 · `npm test` 84 묶음 1044 통과 · `npx expo export --platform web` exit 0.
- 2026-11-20 묶음 A②(워크트리 `.wt-app-me`, 브랜치 `feat/me-tab`, develop `7f00ac0` 위 — A① · A⑥ 합친 뒤). 상위 계획의 "바뀌는 줄"(면책 문구 없음 064 · 쓰는 중 · 못 썼을 때는 `StateScreen` 061 · 탭 넷)을 따름. 시작: 89 묶음 1121 통과.
  - 태스크 6: 044 앞머리 `superseded_by` 에 048(4 의 "풀이 읽기 → 내 별명")을 덧붙임. 045 는 046~054 와 겹치는 데가 없어 표시하지 않음(확인함). 결정 번호 겹침 없음(`uniq -d` 비어 있음). 커밋 c868890
  - 태스크 7: `api.ts` 에 `KnownBasisItem` · `BasisItem`(모르는 kind 는 받음) · `Reason` · `Star` · `MeAreaReport` · `MeReport` · `MeReportState` · `MeReportRequest`, 검사 `isReason` · `isMeReport`(다섯 영역 순서 · 영역마다 제 칸만 — 다른 영역의 칸이 있으면 INVALID · 문단 4(연애 0) · 키워드 3 · 쓰인 별 1~3 · 일 방식 정수 0~100) · `isMeReportState`, `requestMeReport()` · `getMeReport()`. `isReading` 은 문단 `reason` · 보완점 2 를 요구(옛 근거 낱말 `basis` 는 있으면 낱말 목록). 예시 `me-report.json`(시안 12-8~12-12 글 + 예시 차트에 맞춘 근거). 확인: 새 시험 16 먼저 실패 → 통과. 커밋 f7c8463
  - 태스크 8: 용어 사전에 값만 더함(하늘 지도의 키는 그대로). **채운 말 목록** — 별자리 꾸밈말: 시안 물병 자유로운 · 염소 차근차근 쌓는 · 천칭 균형을 아는 · 게 품어 주는 / 채움 양 먼저 나서는 · 황소 꾸준한 · 쌍둥이 호기심 많은 · 사자 당당한 · 처녀 꼼꼼한 · 전갈 깊이 파고드는 · 사수 멀리 내다보는 · 물고기 공감이 깊은. 별의 이유 이름: 달만 "마음"(시안), 나머지는 별명. 지나가는 별 이름: 달 "마음을 비추는 별"(시안), 해 "빛을 비추는 별"(채움 — 별명 "나의 중심" 은 "지금 나의 중심(해)이 내 나의 중심…" 이 되어서), 나머지는 별명. 물음표 말: 해 "흔히 말하는 '내 별자리'예요."(시안 12-2), 달 · 수성 · 금성 · 화성 · 목성 · 토성 · 천왕성 · 해왕성 · 명왕성 · 상승점 · 중천은 채움(그 별을 한 줄로 알려 주고 무엇을 읽을 때 보는지). 각도의 이유 말: 사분 부딪히는 각도 · 육분 · 삼분 잘 어울리는 자리 · 충 마주 보는 자리(054), 합 겹치는 자리(채움). 지나가는 별의 각도 말(transitPhrase)은 같은 말. 별 수: 셋~열. 하우스 모임의 물음표 · 지도 읽기 이름 등 이음말은 `strings.reason`. 확인: 시험 5 먼저 실패 → 통과. 커밋 29793e5
  - 태스크 9: `features/reason/reason-sentence.ts`(SHARED_FEATURE_FILES). 시안 문장 여섯 + 상승점 · 중천 둘 · 달 · 금성 문장과 글자까지 같음, 굵은 자리도 시안대로. 근거가 둘이면 앞을 "…있었고," 로 잇는다(054 에 틀이 없던 경우 — 상승점 · 중천 둘만 "…가, …가 있었어요"). 시각 모름이면 하우스 부분을 빼고 하우스 · 상승점 · 중천만으로 된 근거는 숨김, 모르는 kind · 사전에 없는 값 · 버텍스는 null. 확인: 시험 10 먼저 실패(모듈 없음) → 통과. 커밋 c1bc6ce
  - 태스크 10: `ReasonLine`(접힌 상자 ⌃ · 펼침 ⌄ — 061 의 7) + `reason-terms.ts`(용어 줄 1~3 · 빛낼 별 · 칸) + 공용 `ChartWheel.tsx` 에 `MiniWheel`(하늘 지도 휠의 좌표를 지름 120 으로 — 기능 경계를 옮기지 않고 이미 공용인 파일에 더함). 물음표는 하늘 지도의 `InfoTip` · 같은 글(해만 시안의 말). "하늘 지도에서 보기" → `/chart?selected=<별>` — 내 하늘 지도가 쿼리를 받게 함(고를 수 없으면 해). 지나가는 별은 지도 · 하늘 지도 보기 없음. 확인: 시험 9(+하늘 지도 1) 먼저 실패 → 통과. 커밋 f789bfd · 테마 목록 시험 9a305b4
  - 태스크 11: `MakingView` 를 `components/making-view.tsx` 로 옮김(옮기기만, 별명 공개의 `usePulse` 도). 확인: 온보딩 · 별명 짓는 중 시험 그대로 통과. 커밋 58cfa6a
  - 태스크 12: `/reading` = 내 별명 전체 페이지(보드 12 받은 뒤): 꺾쇠 머리 + 오른쪽 공유 아이콘(지금의 요약 해석 카드 시트 — `ShareEntry trigger="icon"`, `NavBar right`), 한 줄 별명 26/36, 별자리 카드 `SignCard`(옛 `KeyThree` 를 바꿈), 문단 19/27 · 16/26 + `ReasonLine`, 강점 · 보완점 16/26. "연애에서 해 볼 만한 것" · "내 차트 보기" · 면책 문구 없음. 아래 탭은 나. 별명 공개의 "풀이 읽기" 도 이 화면(같은 화면이라 그대로). 확인: 시각 앎/모름(셋 · 둘, 이유 줄의 하우스) 포함 시험 7 먼저 실패 → 통과. 커밋 80c7b70
  - 태스크 13: `/me` + `features/me`. `use-me-report`(5초 확인 · 보관 `byeolmyeong.meReport.v1` · 처음 확인의 FAILED 는 받기 전 · 402 는 한 줄), 받기 전 = `ReadingView` + 자세한 풀이 카드, 받은 뒤 = 별명 카드(→ `/reading`) + 칩 다섯(`?area=`) + 영역 칸(`AreaView`) + 번호 문단, 쓰는 중 = `MakingView` 에 나 탭 제목 · 문구(11-8 — 머리 · 탭 없음), 못 썼을 때 11-9(다시 쓰기 · 나중에 하기, 탭 없음), 상태를 못 물으면 카드 자리 안내 `CardFail`(19-1, 공용 부품으로 — A⑥ 이 만들지 않았던 것), 처음 불러올 때 0.3초 넘으면 `MeSkeleton`(24-1). 아래 탭 나 → `/me`, 탭 안 화면(내 별명)에서 나 탭을 다시 누르면 `/me`(`MainTabs nested` · `BottomTabs onReselect`). 막대에 숫자 없음 · 값 다시 셈 없음. 확인: 훅 14 · 화면 18 · 쓰인 별 3 · 탭 2 먼저 실패 → 통과. 커밋 eb49990
  - 태스크 14: 지울 목록을 먼저 출력하고 지움 — `app/direction.tsx` · `features/direction` 의 use-direction · future-direction · use-future-direction(+시험) · `features/report/report-view.tsx` · `api.createDirection` · 이성 · 미래 · 리포트 영역 탭 문구. 궁합 방향성 · 시기 로직은 남김. `app/report.tsx` 를 `app/timing.tsx`(시기 부분만 — 옛 `GET /reports/me`)로 옮기고 아래 탭 시기 → `/timing`. 시험도 `timing-screen.test.tsx` 로 옮겨 영역 탭 · 미래 방향성 시험을 덜어 냄. 확인: `grep` 으로 `/direction` · `/report` 링크 0, tsc · lint 통과. 커밋 840abb6(제목에 "화면 제거")
  - 태스크 15: release-1.0.0 F3 · F4 · F10 · 화면 표, product 수익 모델, CLAUDE.md(첫 문단 "광고와 자세한 풀이 유료화" · 기능 폴더) 55줄, architecture(features/me · reason · SHARED · 흐름), DESIGN 부품 목록. 커밋 dd81497
  - 태스크 16(웹 390, 모의 API · 개발 서버 8121 — 찍고 끔, 보드는 피그마 `PNrWFsXHhF8crQkLA3SYBn` 나 · 홈 · 공통 상태 페이지에서 받음): 고친 것 둘 — ① 나 탭의 칸 사이에 화면의 간격 16 이 끼어 칩 · 영역 카드가 16~32 아래였다(보드 12-8 칩 y 148 → 164) → 한 덩어리로 0c174d7 · ② 실패 화면의 "나중에 하기" 가 밑줄 링크였다 → 보드 11-9 대로 가운데 회색 단추(48) 6349a5c. **채널 차 > 24 비율**(보드 | 앱, 글은 시안 문장 · 근거는 예시 차트 쌍둥이자리라 이유 문장 · 별자리 그림은 의도한 차이): 머리 · 별명 카드 · 칩(y 0~200) 성격 4.80 · 연애 4.82 · 관계 4.78 · 일 4.84 · 감정 4.78% / 영역 카드(12-8, y 200~540) 9.07% / 보드 전체 12-8 12.00 · 12-9 12.68 · 12-10 11.15 · 12-11 11.51 · 12-12 10.26% / 받기 전 12 21.80% · 내 별명 12(받은 뒤) 17.67%(시안 글은 글자 단위로 줄을 바꾸고 앱은 낱말 단위 — 줄 수가 달라 아래가 밀림) / 이유 펼침 12-1 10.71%(머리 1.76 · 펼친 상자 6.79%) · 말풍선 12-2 11.21% / 쓰는 중 11-8 5.55% · 못 썼을 때 11-9 9.12%(아래 버튼 칸 1.56% — 그림 · 글이 보드보다 약 29 위: `StateScreen` 의 가운데 맞춤 틀(A⑥)이라 그대로) / 뼈대 24-1 1.94%. 가로 넘침 0. 콘솔 오류는 favicon 하나뿐. 탭 길: 홈 → 나(`/me`) → 내 하늘 지도 보기(`/chart`) → 뒤로(`/me`) → 시기(`/timing`), 브라우저 기록 3. 스테이징 서버로 가입 → … → 성격 칩 흐름은 S② 가 스테이징에 있어야 해 PR 뒤 소유자 쪽.
  - 독립 리뷰(깨끗한 맥락, diff 와 기준만): 차단 1 · 수정 3 · 제안 몇. 고침(5ef0034) — ① 쓰는 중 화면엔 머리 · 탭이 없는데 확인에 한도가 없어 서버가 WRITING 을 계속 주거나 응답이 멈추면 갇혔다 → 요청 하나 10초, 쓰는 중 3분 넘으면 보드 19(다시 보기는 GET 만) · ② 내 별명은 있고 상태를 10초 넘게 못 물으면 빈 화면 → 카드 자리 안내 · ③ 시각 모름이면 문장에서 빠진 근거가 용어 줄 · 작은 지도에 남았다 → 같은 기준(`needsTime`)으로 거름 · 다 쓴 풀이를 보던 중 연결이 돌아오면 새로 받음 · 키 겹침 · api 주석 자리. 새 시험은 먼저 실패를 봄(4 실패 → 통과). 그대로 둔 것 — ④ 업데이트 직후 홈의 별명 카드: 기기의 옛 요약 해석(`reason` 없음)을 버려 "아직 별명을 짓지 않았어요" 가 나 · 내 별명을 열어 다시 받기 전까지 보인다(홈은 풀이를 부르지 않는다는 A① 의 규칙 — 열린 항목으로 묻는다) · 화면이 가려진 동안(다른 화면을 push)에도 확인이 돈다(`useFocusEffect` 는 제안으로 남김).
  - 계획과 다르게 한 것: 태스크 11 의 "작게 쓰는 크기" 는 쓰는 곳(홈 카드 11-2, A③)이 없어 만들지 않음. 태스크 8 의 각도 "이름" 은 이미 있는 `strings.aspects`(합 · 육분 · 사분 · 삼분 · 충)를 쓰고 사전에 겹쳐 두지 않음. 지나가는 별의 육분 · 삼분은 시안 14-4 대로 각도 이름 없이 "잘 어울리는 자리를 지나요", 사분 · 충만 "(사분)" 을 붙이고 굵게(시안 14-3). 나 탭(받은 뒤)의 공유 아이콘은 나 탭 공유 카드가 서버 S⑥ · 묶음 A⑤ 라 두지 않음. `CardFail` 을 공용 부품으로 새로 만듦(061 의 3 의 카드 자리 안내). 내 별명을 서버가 짓는 중이라 10초가 넘으면(옛 요약 해석만 있던 계정) 나 탭은 별명 짓는 중을 보인다(실패 화면 대신). 일 방식 값 검사는 범위 10~90 대신 막대 안(0~100)만 본다(궁합 점수처럼 서버 값을 판정하지 않음).
  - PR 직전 develop `fa4c1fd`(A⑦ 마이 v2 · 065 앞머리) 위로 다시 올림 — 충돌은 문서 셋(CLAUDE.md 기능 폴더 · DESIGN 부품 줄 · architecture 화면 · 기능 · 흐름 줄)뿐이고 양쪽을 살려 풂(마이 v2 의 줄을 되돌리지 않았는지 diff 로 확인).
  - PR #49 뒤(코디네이터): develop `05200d5`(로그인 다듬기 #46 · 음악 #48) 위로 다시 올림. 충돌은 044 앞머리(045 · 048 · 067 셋 다 살림) · eslint SHARED_FEATURE_FILES(음악 + 이유 둘) · MakingView(음악 청하기 + 제목 · 문구) · 문서 셋(CLAUDE.md · DESIGN · architecture — 음악 · 로그인 줄을 되돌리지 않았는지 diff 로 확인). 고친 것 둘:
    - 음악 PR 은 별명 짓는 중(그때 features/reading)이 waiting 을 청했는데, 이 PR 이 MakingView 를 공용으로 옮겨 공용이 기능을 import 하게 됐다 → MakingView 에서 빼고 내 별명(짓는 동안) · 나 탭(쓰는 중 · 서버가 짓는 중)이 `useSoundtrack('waiting', 쓰는 중)` 으로 청함. 화면 시험 둘 먼저 실패 → 통과.
    - 남은 질문 1(이 PR 의 회귀): 업데이트 직후 홈이 "아직 별명을 짓지 않았어요" 를 보였다. 서버에 다시 짓지 않고 돌려주는 GET 이 없고 `POST /readings` 는 옛 글만 있는 계정이면 새로 지어서, 홈은 부르지 않고 기기의 한 줄 별명 · 만든 때만 느슨하게 읽는다(`useStoredHeadline`). 글 화면은 그대로 엄격히 다시 받는다. 홈 시험 먼저 실패 → 통과.
    - 질문 2(11-9 위치) · 4(가려진 동안 확인)는 그대로, 질문 3(스테이징 흐름)은 합친 뒤 코디네이터 확인.
  - 그 뒤 develop `9c4be0c`(문의 앱 안 #50)가 들어와 한 번 더 다시 올림(충돌: fixtures 목록 · 업데이트 미루기 시험의 import · architecture 세 줄 — 양쪽 살림, 문의 줄을 지우지 않았는지 diff 로 확인).
  - 두 번째 독립 리뷰(0884dbc 기준 — 차단 0 · 수정 3 · 제안 9, 코디네이터가 전달) 반영. 모두 시험을 먼저 실패로 본 뒤 고침:
    - 수정 1: 다 받은 풀이를 보던 중 연결이 돌아오면 상태 확인을 불러, 그 GET 이 실패하면 풀이가 사라졌다 → done 은 조용한 새로 받기(`refresh` — 실패 · 다 쓴 것 아님이면 그대로, 겹치지 않음).
    - 수정 2: 서버가 내 별명을 새로 짓느라 10초가 넘으면 머리 · 탭 없는 별명 짓는 중에 갇혔다 → `MakingView` 에 아래 탭 자리를 더해 "나" 머리 + 아래 탭과 함께.
    - 수정 3(홈 회귀 — 위 `useStoredHeadline`): 다시 짓지 않고 돌려주는 GET 이 서버에 없어 "조용히 다시 받기" 는 생성을 시작할 수 있다 → 리뷰어 안(중립 문구)보다 기기의 한 줄 별명을 그대로 보이는 쪽을 골랐다(옛 글이어도 그 사람의 별명이 맞고 지어낸 말이 아니다 · 서버를 부르지 않는다). 마이 별명 카드도 같은 훅으로.
    - 제안 4 사전을 제 키로만 찾기(`lookup`), 5 모르는 `when` 도 그 줄만 숨김(`isReason` 이 받음), 6 `saveProfile` 도 10초 한도, 7 DESIGN 브랜드 자리 · `Paragraph` 설명, 8 지나가는 별이 상승점 · 중천과 합이면 "자리" 를 겹치지 않음, 9 시험(받은 풀이 + 연결 복귀 실패 · 옛 보관본으로 홈 · 마이 · 나 탭 · 나 탭 업데이트 미루기).
    - 미룸(코디네이터): 웹 `/report` · `/direction` 북마크 404, `fixtures.direction` · `direction-future.json` · LOVE/FUTURE 는 S⑦ 정리 때.
  - 확인(마지막): develop `aa61794`(문의 안내 #54) 위로 다시 올린 뒤 `npx tsc --noEmit && npx expo lint` exit 0 · `npm test` 100 묶음 1264 통과 · `npx expo export --platform web` exit 0 · `npx expo-doctor` 20/20.
- 2026-11-20 묶음 A③(워크트리 `.wt-app-a3`, 브랜치 `feat/timing-tab`, develop `89d8a34` 위 — A② 합친 직후 → PR 전 develop `0829e4d`(#57) 위로 다시 올림). 상위 계획의 "바뀌는 줄"(탭 넷 · 그날의 하늘 면책 문구 없음 064 · 쓰는 중 · 못 썼을 때는 `StateScreen` 061)과 코디네이터가 그 사이 전한 것을 따름: S④ 계약은 서버 develop `f25f23b`(`origin/feat/day-sky` 와 차이 없음을 대조) · 쓰는 중 화면의 음악 줄은 넣지 않음(결정 069) · 공유 아이콘은 자리만(A⑤ 가 `ShareEntry` 를 꽂는다) · 뼈대는 그 화면의 배치를 본뜬다(결정 071 — ADR 파일은 코디네이터 쪽) · `reading.tsx` 는 건드리지 않음. 시작: 100 묶음 1264 통과.
  - 태스크 17: `MonthSky` · `TimingReport`(구간의 summary · detail · practices 셋 · reason, `current.mainId`) · `TimingReportState` · `DaySky`, 검사 `isMonthSky` · `isTimingReport` · `isTimingReportState` · `isDaySky`(모르는 칩 · 영역은 받아 두고 그 줄만 숨김), `getMonth(month?)` · `requestTimingReport()` · `getTimingReport()` · `postDaySky(date?)`. 예시 `month-sky` · `timing-report`(+시각 모름) · `day-sky` 는 캔버스 14 보드의 글 · 날짜에 맞춤(오늘 2026-11-19, 대표 구간 i11). 확인: 시험 17 먼저 실패(예시 없음) → 통과.
  - 태스크 18: `strings.timing`(칩 · 잠금 · 자세한 풀이 · 이번 달 · 올해 · 인생 · 시기 자세히 · 그날의 하늘 · 쓰는 중 · 429 · 시각 모름 · 홈 칸). "변곡점" → "큰 변화". 확인: 시험 5 중 4 먼저 실패 → 통과(빈 값 · 단정 표현 없음).
  - 태스크 19: `features/timing/` — `dates.ts`(옛 `report/timing.ts` 의 formatMonth · formatPeriod 와 그 시험을 옮기고, 달력 칸 · 요일 · 누를 수 있는 범위 · 올해 띠 자리 · 다가오는 시기 · 시기 자세히의 "지금" 자리), `use-timing-report.ts`(나 탭 풀이와 같은 규칙 · 보관 `byeolmyeong.timingReport.v1`, 보관본 먼저 · 뒤에서 새로 — 결정 049 의 9 의 "날짜가 다르면" 은 늘 새로 받는 것에 들어간다), `use-month.ts`(달별 · 보관 없음 · 첫 달 ±1 · 404 면 저장 뒤 한 번 더 · 10초). 확인: 시험 29(모듈 없음으로 먼저 실패) → 통과.
  - 태스크 20: 이번 달(14-1 · 14 받기 전 · 14-1 없음) — 지난 날 흐림 · 오늘 주색 원 · 칩마다 점 색(보드) · 범위 밖 못 누름 · 모르는 칩 숨김 · 그달만 못 받으면 19-1. 확인: 시험 7 → 통과.
  - 태스크 22(21 보다 먼저 — 시기 탭이 올해 · 인생을 그리므로): 올해(띠 · 지금 지나는 중 대표 먼저 · 다가오는 시기 셋 · 작은 실천, 시각 모름이면 돈 줄 없음) · 인생(다음 큰 변화 · 네 줄의 길 · 공유 아이콘 자리만). 확인: 시험 8 → 통과. 테마 목록 시험에 `yearBig` 한 줄(빠뜨려서 다음 커밋).
  - 태스크 21: `app/timing.tsx` → `app/timing/index.tsx`. 받기 전 이번 달만 · 잠긴 칩은 그 자리에 자물쇠 카드(14 잠긴 칩 — 계획의 기본값 "자세한 풀이 카드로 굴림" 대신 시안), 받은 뒤 대표 구간 카드 · 처음 칩 올해 · `?tab=`, 쓰는 중 14-7 · 못 썼을 때 14-8 · 뼈대 · 19 · 20-1 · 19-1. 옛 임시 화면의 시험을 새 시험으로 바꿈(13 중 12 먼저 실패 → 통과), 시기 탭의 다음 변곡점 공유 시험 둘은 뺌(공유는 A⑤), 업데이트 미루기 시험은 새 경로로.
  - 정리(지울 목록을 먼저 출력하고 지움, 커밋 제목에 "공용 API 제거"): `features/report/`(timing.ts · timing-view.tsx · use-report.ts 와 시험) · `api.requestReport` · `getReport` · `Report` · `ReportSection` · `REPORT_AREAS` · `isReport` · `isReportState` · 예시 `report.json` · `report-timing-time-unknown.json` · `strings.report`. `ReportTiming` 은 `TimingReport` 로 이름만. 옛 시기 모양 검사 시험은 `isTimingReport` 로 옮김.
  - 태스크 23: `/timing/period?id=`(자세한 글이 있는 구간만 — 없으면 시기 탭으로 가는 안내) · `/timing/day?date=`(쓰는 중 · 못 썼을 때 머리만, 429 한 줄, 400 은 돌아가기, 404 면 저장 뒤 한 번 더, 오늘이면 "오늘"). 확인: 시험 9 → 통과(화면 파일 없음으로 먼저 실패).
  - 태스크 24: 홈의 시기 칸(보드 11 · 11-1 · 11-2) — 로그인이 확인된 뒤 상태만 묻고(만들기는 시기 탭), 쓰는 중이면 칸 없음, 못 물으면 19-1, 404 면 숨김. "지금" 점의 자리는 시안 그림 그대로(`TimingLayout.home.nowAt` — 날짜로 셈하지 않음). 확인: 시험 5 중 4 먼저 실패 → 통과.
  - 뼈대(결정 071): 화면 파일마다 다 그려진 배치를 본뜬 뼈대(`SkLine` — 글자 단계의 줄 높이, `SkBlock` — testID `sk-<칸>`). 시기 탭은 받아 둔 풀이가 없을 때만 보이므로 이번 달이면 받기 전 모양, `?tab=year|life` 면 받은 뒤 모양. 그날의 하늘은 0.3초 넘으면 뼈대 · 3초 넘으면 쓰는 중(서버가 쓰는 중인지 알려 주지 않는 동기 응답이라). 잠긴 칩의 흐린 미리보기도 그 칩의 뼈대로. 확인: 뼈대 ↔ 다 그려진 화면의 칸 차례 · 수 시험 6(뼈대 줄 하나를 빼면 실패함을 봄) + 화면마다 0.3초 뒤 뼈대 시험.
  - 다시 올림: develop `0829e4d`(#52 · #53 · #55 · #56 · #57 — 이용 정지 · 출생 정보 바꾸기 · 음악 1.1.0 · 가입 이어 하기 · 스플래시) 위로. 충돌은 api.ts(develop 이 getAccount 를 getMyAccount 로 합침 — 시기 호출만 더함) · 홈 index(첫 데이터 스플래시 + 시기 칸, 양쪽 살림) · 홈 시험의 계정 가짜 · architecture 두 줄(가입 이어 하기 · 홈 줄을 살리고 "A③ 전까지 임시 화면" 만 뺌). develop 의 이용 정지 시험이 쓴 `api.getReport` 는 `getTimingReport` 로(따로 커밋). 남의 변경을 되돌리지 않았는지 develop 과의 diff 의 지운 줄로 확인(모두 이 묶음의 줄). 다시 찍은 화면 숫자는 위와 같음.
  - PR #63 뒤 develop `6ab12ee`(#58 구글 웹 되돌아오기 · #59 마이 › 알림) 위로 한 번 더 다시 올림: 충돌은 api.ts(계정 호출의 주석 한 줄 — develop 쪽을 살림) · DESIGN 부품 줄(구글 070 을 살리고 뼈대 규칙만 더함) · architecture 두 줄(알림 · 구글 되돌아오기 줄을 살리고 시기 줄만 바꿈). develop 과의 diff 의 지운 줄은 모두 이 묶음의 줄. 실제 오늘이 11월 21일이 되자 그날 시험(11월 21일)이 "오늘" 로 읽혀 떨어져 시계를 2026-11-19 로 고정(따로 커밋).
  - 확인(마지막, develop `6ab12ee` 위): `npx tsc --noEmit && npx expo lint` exit 0 · `npm test` 118 묶음 1439 통과 · `npx expo export --platform web` exit 0 · `npx expo-doctor` 20/20. (그 전 `0829e4d` 위에서는 기계 부하 60 이 넘을 때 느린 묶음이 시간 초과로 떨어져 `-w 3` 으로 다시 돌려 모두 통과 — 혼자 돌리면 늘 통과)
  - 태스크 25(웹 390, 모의 API · 개발 서버 8123 — 찍고 끔, 기기 시계는 시안의 오늘 2026-11-19, 보드는 피그마 `PNrWFsXHhF8crQkLA3SYBn` 시기 · 홈 페이지): 고친 것 둘 — ① 구간 줄의 이름과 딱지 사이에 맨 위 카드의 간격(12)이 끼었다 → 6 · ② 잠긴 칩의 자리가 약 20 아래 → 칩 위 8 · 잠긴 자리는 칩 바로 아래부터. **채널 차 > 24 비율(보드 | 앱, 전체 / 위 360)**: 받기 전 14 6.92 / 3.01 · 잠긴 칩 7.45 / 6.61(고치기 전 13.52) · 이번 달 14-1 7.43 / 8.52 · 없음 14-1 8.42 / 8.52 · 올해 14 7.97 / 8.51(고치기 전 9.24) · 인생 14-2 9.31 / 8.50 · 시기 자세히 14-3 9.97 / 8.08 · 그날 14-4 7.20 / 8.52 · 그날 쓰는 중 8.59 / 8.06 · 그날 못 썼을 때 9.31 / 10.76 · 시기 쓰는 중 14-7 6.00 / 5.91 · 못 썼을 때 14-8 8.90 / 12.35 · 홈 11 7.93 / 10.20 · 11-1 7.63 / 10.08 · 11-2 5.63 / 10.10. 의도한 차이: 맨 위 카드 이름의 줄바꿈(앱은 낱말 단위) · 달력 6 · 12 일의 점(예시는 서버 최대 셋) · 공유 아이콘(A⑤) · 홈의 오늘의 하늘 카드 · 종(A④) · 잠긴 칩의 흐림(뼈대로) · 실패 화면의 그림 높이(`StateScreen`, A⑥) · 아래 탭의 안전 영역. **뼈대 ↔ 다 그려진 화면(칸마다 위 · 높이)**: 받기 전 · 올해 · 시기 자세히 · 그날 · 홈 0px, 인생 1px(처음 4px — 눈금 줄 높이 · 이유 상자 두 줄 사이 틈 · 줄 수를 고침). 넓은 화면(1280)은 가운데 480 · 바깥 밤색. 가로 넘침 0, 콘솔 오류는 이름을 못 찾는 바깥 자원 하나(+ 그날 못 썼을 때의 의도한 502).
  - PR #63 독립 리뷰(01d17cf — 차단 0 · 수정 3 · 제안 9, 코디네이터가 전달) 반영, develop `82f48dc`(#60 화면 배치 뼈대 · #62) 위로 다시 올린 뒤:
    - 수정 1: 시각 "모름" 이중 안전이 띠의 돈 줄에만 있었다 → 거르는 함수 하나(`features/timing/time-known.ts` 의 `shownTiming` · `shownMonth`)를 올해 · 인생 · 지금 나의 시기 · 시기 자세히 · 홈 시기 칸 · 이번 달(돈 영역 줄, 상승점 · 중천 · 하우스가 근거인 날)에. 빠진 대표 구간은 없앤다. 시험 6(거름을 끄면 모두 실패).
    - 수정 2(제안 11): #60 이 들어와 시기의 `SkLine` 을 공용 `SkeletonText` 로, 화면마다 `SkeletonGroup` 하나로 묶고 `SkBlock` 은 본뜬 칸의 testID 만 다는 보통 View 로. develop 에서 `SkeletonCard` 가 지워진 것은 그대로 따름.
    - 수정 3: **공용 훅 통합: 2026-11-21 2차 빌드 뒤 다음 PR(golden rule 중복)** — 첫 PR(`refactor/detail-report-hook`): `withTimeout` 을 `lib/with-timeout` 하나로(나 탭 · 시기 · 이번 달), 공용 훅 `lib/detail-report` 를 만들어 시기 풀이가 먼저 씀(기존 시험 그대로 통과 · 공용 훅 시험 8). 나 탭 풀이를 옮기는 것은 둘째 PR. 그 전에는 `use-timing-report.ts` 가 `use-me-report.ts` 의 사본(`withTimeout` 세 벌 포함).
    - 제안 4: 열었을 때 이미 쓰는 중이면 꺾쇠 머리 · 아래 탭이 있는 틀 안의 쓰는 중(받기를 누른 직후의 14-7 은 그대로). 5: 홈 시기 칸은 상태를 한 번만 묻는다(`useTimingReport(…, { poll: false })` — 쓰는 중이어도 5초마다 묻지 않고 3분 뒤 실패로 굳지 않음). 6: 시기 탭 실패 갈래 시험 넷(쓰는 중 확인 실패 · 3분 → 19, 받기 429 → 14-8, 받기 중 끊김 → 20-1). 7: 눈여겨볼 날 0개 안내에서 "다음 달 1일에 새로 알려 드려요" 를 빼고, 다른 달을 볼 때는 "12월 …" 으로. 8: 잠긴 칩의 미리보기는 멈춘 막대(공용 `SkeletonStill`). 9: 그날의 하늘 — 받은 글에 연결 끊김 띠, 다른 400 · INVALID 는 돌아가기. 10: DESIGN 브랜드 자리에 홈 시기 칸 줄 · "지금" 점 · 이번 달 내내 띠 · 인생 길의 점 · 시기 자세히 "지금" 점.
    - 12(옛 NEXT_TURN 공유 진입 정리)는 A⑤ 담당.
    - develop `949d2c6`(#64 휴대폰 푸시) 위로 다시 올림(충돌은 CLAUDE.md 기능 폴더 한 줄 — push 를 살리고 report → timing). 확인: `npx tsc --noEmit && npx expo lint` exit 0(로컬 eslint 캐시가 새 패키지 expo-notifications 를 못 찾아 `--no-cache` 로 — 캐시 없는 CI 와 같음) · `npm test` 122 묶음 1511 통과 · `npx expo export --platform web` exit 0 · `npx expo-doctor` 20/20.
  - 계획과 다르게 한 것: 잠긴 칩은 시안 14 잠긴 칩대로(굴리지 않음) · 흐림 대신 뼈대 · 눈여겨볼 날 0개 문구는 시안 14-1 · 065 의 3("흘러가요" · 설명) · 이번 달의 점 색 · 딱지 글자 색은 칩마다(보드) · 다가오는 시기는 오늘 뒤 1년 안 셋(기본값 그대로) · 시기 풀이 훅은 나 탭 풀이 훅을 본뜬 사본(공용으로 합치는 일은 A② 코드를 건드려 따로) · 그날의 하늘의 쓰는 중은 3초 뒤.
- 2026-11-20 묶음 A⑤(워크트리 `.wt-app-a5`, 브랜치 `feat/share-v2`, develop `5b9b229` 위). 서버 계약은 S⑥(서버 PR #43 `feat/share-v2`, 아직 develop 아님 — 이 PR 은 S⑥ 가 develop 에 들어간 뒤 합친다). 상위 계획의 "바뀌는 줄"(궁합 카드 없음 055 의 6 · 공유 시트 제목 없음 A7-5)을 따름.
  - 태스크 30: `origin/docs/instagram-story-share`(PR #34)의 계획 파일을 이 브랜치로 가져와 앞머리에 "053 이 결정, 실행은 home-me-timing A⑤" 한 줄. 그 계획의 태스크 대응표:

    | 그 계획 | 이 계획 | 넓힌 것 · 바꾼 것 |
    |---|---|---|
    | 1 adr-share-card-story | (하지 않음) | 결정 053 이 맡음 |
    | 2 strings-share | 31 | 카드 넷의 글(이름표 · 칩 · 한 줄 소개) · 시트 버튼 · 짧은 알림 문구 |
    | 3 story-module-spike | 31 | 실제 기기 비교는 새 개발 빌드 뒤(32 의 기기 표) — 고른 쪽과 이유는 아래 실행 기록 |
    | 4 share-card-sky | 31 | "나의 별자리" 한 장 → 카드 넷(내 별명 · 나 탭 영역 · 오늘의/그날의 하늘 · 다음 큰 변화, 결정 053 의 2) |
    | 5 share-sheet-app | 31 | 시트를 여는 자리를 넷으로(내 별명 · 칩 다섯 · 오늘의/그날의 하늘 · 다음 큰 변화) |
    | 6 save-to-photos | 31 | 그대로 |
    | 7 share-sheet-web | 31 | 그대로 |
    | 8 verify | 32 | 시안 보드 10장(12-4~12-7 · 12-13 · 12-14 · 11-6 · 11-7 · 14-5 · 14-6)과 나란히 |
  - 태스크 31(그 계획의 2~7): 문구 → api(카드 넷 타입 · 검사 · 본문 · 예시) → 카드 넷(360 카드 값 `ShareCardLayout` 을 너비로 줄임, 해 별자리 `SignArt` 는 공용 ChartWheel.tsx, 영역 그림은 `me/area-art.tsx` 를 SHARED 에) → 의존성(`expo-media-library` · `react-native-share`, 플러그인은 Meta 앱 ID 가 있을 때만) → `openStory` → 저장 · 스토리(없으면 기기 공유 창) → 시트 v2(제목 없음 · 보조 저장 위 / 주 스토리 아래 · 결과는 Toast) → 내 별명 · 나 탭 아이콘 → 옛 것 지움(share-url · sendLink · READING/NEXT_TURN 요청 · 옛 시기 화면 공유 버튼 · 문구 · `EXPO_PUBLIC_WEB_URL` · `expo-clipboard`) → 카드 모양 뼈대(071) → 웹 저장 정확히 1080×1920 → 카드 기억(소유자 지적). 새 동작마다 시험을 먼저 실패로 봄.
  - 그 계획 태스크 3(스토리 모듈 고르기): 실제 기기 비교는 새 개발 빌드 뒤. 고른 것 `react-native-share`(12.3.1, TurboModule · 자체 Expo 플러그인 · iOS 붙여넣기 보드 5분 + `instagram-stories://share` · 안드로이드 ADD_TO_STORY 인텐트 — Meta 문서와 같음). Expo 모듈에는 스토리가 없고, 직접 만든 모듈은 기기 시험 없이 넣기에 위험이 커서. 사진 저장은 Expo 권장 `expo-media-library`(SDK 58 의 새 API `requestPermissionsAsync(true)` · `Asset.create` — 옛 API 는 기본 입구에서 던진다).
  - 서버 계약 대조: S⑥(서버 PR #43)가 develop(c31395c)에 들어간 뒤 서버 develop 의 share 패키지 · architecture.md 를 이 브랜치가 맞춘 판과 비교 — 차이 0줄.
  - 화면(웹 390 · 1280, 모의 서버 · 개발 서버 8125 — 찍고 끔, 보드는 캔버스 HTML 을 로컬 글꼴로 헤드리스 크롬에서 찍음): 12-5 휴대폰 웹 시트 · 12-6 컴퓨터 웹 시트 · 12-7 내 별명 카드(웹 "이미지 저장" 이 내려받은 1080×1920 을 줄여 비교) · 12-13 나 탭 시트 · 12-14 영역 카드 다섯 · 11-6/11-7 오늘의 하늘(임시 미리보기 화면 — 커밋 안 함) · 14-5/14-6 다음 큰 변화 · 기다리는 동안 뼈대. 가로 넘침 0, 콘솔 오류는 이름 풀이 실패 하나(모의 환경의 바깥 주소). 앱 시트(12-4 · 12-13 · 11-6 · 14-5)의 스토리 버튼은 웹에 없어 버튼 칸만 다르다(일부러).
  - 계획과 다르게 한 것: 그날의 하늘(오늘이 아닌 날)의 한 줄 소개 "하늘의 움직임으로 읽는 하루"(시안 없음) · 칩 "11월 21일 · 그날의 하늘" · 이름표 "새벽별 님의 11월 21일"(053 의 2 그대로). 닉네임이 없으면 "나의 …". 오늘인지는 한국 날짜로 가린다. 받은 카드 기억(소유자 지적 — 다시 열면 바로, 뒤에서 확인). 궁합 SCORE · RANKING 대상 · 내 이름 칸은 남김(055 의 1).
  - 독립 리뷰(#61, 69acd7b — 차단 1 · 수정 1 · 제안 9, develop `82f48dc` 위로 다시 올림): 차단 — 화면에 들어올 때 미리 받기가 공유하지 않은 사람의 공개 스냅샷 · `SHARE_CREATED` 를 만들었다(서버 결정 012 · 053 의 3) → 뺌(코디네이터 결정, 미리 받기는 서버의 저장하지 않는 미리보기 길이 생기면 — 소유자 결정 대기). 수정 2 — 진행 중 요청이 기기 지우기 뒤에 끝나면 앞사람 카드를 다시 썼다 → 세대 표식(리뷰 재현 R1 을 반대로 지키는 시험). 제안 3 키마다 따로(R2) · 4 안드로이드 11 이상은 권한을 묻지 않음 · 5 한국 날짜의 오늘을 `lib/korea-date.ts` 하나로(시기 보관본도) · 6 한 줄 소개 굵기 400 · 7 뼈대 값은 `ShareCardLayout.skeleton` + 공용 `Skeleton`/`SkeletonGroup`, 10초면 실패 안내, 뼈대 ↔ 카드 크기 시험 · 8 app.config 플러그인 분기 시험 · 9 카드만 보관 · 지난 그날의 하늘 정리 · 11 두 번 눌림 막기를 ref 로. 진행 중 요청 같이 쓰기는 미리 받기가 없어져 뺐다(멈춘 요청이 다시 시도를 막지 않게). 10(product 지표)은 소유자 문서라 손대지 않음.
  - A③(#63, develop `ec0a796`) 뒤 다시 올림: 옛 시기 화면(`app/timing.tsx` · `timing-view.tsx` · `use-report.ts`)은 지우는 쪽을 따름, 시기 탭의 `koreaToday` 도 `lib/korea-date.ts` 하나로. 그날의 하늘 머리 오른쪽 `ShareEntry DAY_SKY`(그날 날짜) · 인생 칩의 다음 큰 변화 카드 오른쪽 위 `ShareEntry NEXT_BIG`(카드 안 작은 아이콘 `cardIcon` — 누르는 칸 40 · 아이콘 20, 보드 14 인생 · 14-5). 시험: 아이콘 → 시트(제목 없음) · 열 때 createShare 1회.
- 2026-11-21 묶음 A④(워크트리 `.wt-app-a4`, 브랜치 `feat/today-inbox`, A③ `feat/timing-tab`(PR #63) 위에 쌓음 — `postDaySky` · `DaySky` · `DayView` · 날짜 도구를 A③ 것 그대로 쓴다). 상위 계획의 "바뀌는 줄"(알림 종류에 `INQUIRY_ANSWERED` · 궁합 리포트 숨김 · 면책 문구 없음 · `StateScreen`) · 결정 071(뼈대는 다 그려진 배치를 본뜬다)을 따름.
  - 태스크 26: `getNotifications` · `markNotificationRead` · `isNotificationList`(종류는 비지 않은 글자면 받고 알림함이 숨김) · 예시 `notifications.json` · `strings.notifications`. 확인: `api-notifications.test` 6 먼저 실패 → 통과, 문구 시험 3.
  - 태스크 28: `/notifications`(오늘 · 최근 7일 · 최근 30일 — 받은 시각을 한국 시간대로 읽어 견줌, 안 읽음 점, 누르면 읽음 + 이동 · 읽음 실패해도 이동, 비었을 때 11-3-1, 뼈대 · 19 · 20-1) · 홈 종(점 · 홈을 열 때 · 알림함에서 돌아올 때 다시 물음 · 404 면 숨김). 확인: 줄 규칙 9 · 화면 6 · 홈 종 3.
  - 태스크 27: `/today`(DayView — 오늘이면 "오늘의 흐름" · "오늘의 작은 실천" · 이유 머리 "오늘", 공유 자리만) · `useTodaySky`(날짜 없이 POST, `byeolmyeong.daySky.v1` · 날이 바뀌면 다시 · 한 번만 묻기 · 다시 쓰기는 새로) · 홈 카드(짧은 이유 `reasonBrief` · 뼈대 → 쓰는 중 카드 · 19-1 · 404 숨김) · 달력의 오늘 → `/today`. 확인: 짧은 이유 4 먼저 실패 → 통과 · 훅 8 · 화면 5 · 홈 카드 4 · 달력 1.
  - 다시 올림(2026-11-21): A③ 가 develop `949d2c6`(#60 공용 뼈대 · #64 푸시) 위로 올라간 뒤 그 위로. 뼈대는 공용 `SkeletonText` · `SkeletonGroup` 으로, 알림 줄의 본문 · 때는 글자 단계 `notice` · `meta`.
  - 계획과 다르게 한 것: ① `strings.today` 는 태스크 27 커밋에(태스크 26 에는 알림함 문구만) ② 알림함의 갈 곳은 A8-1(#64)의 `pushTarget` 하나를 쓴다(알림 줄을 `PushData` 로 옮김) — 오늘의 하늘 푸시도 `/today` 로 바꿨고, 쓰는 중에 온 푸시(`onPushReceived`)면 홈 종 · 알림함이 다시 묻는다 ③ 홈 종의 점은 서버 `unread` 대신 "보이는 줄 가운데 안 읽은 것" — 숨기는 궁합 리포트만 안 읽었을 때 누를 수 없는 점이 남지 않게 ④ 문의 답변 줄의 본문은 서버가 답 글을 주지 않아 정한 한 줄("문의 내역에서 답변을 확인해 보세요.") — 보드 11-3 은 답 첫 줄 ⑤ 오늘 것을 기기에 두었으면 서버를 다시 부르지 않는다(같은 날 · 같은 차트는 같은 글 — 결정 047 의 2 "조용히 다시 묻는다" 대신) ⑥ 달력의 오늘 → `/today` 는 달력을 누를 때 가른다(`/timing/day?date=오늘` 주소를 바로 열면 그날의 하늘 그대로) ⑦ 홈 쓰는 중 카드의 궤도 점은 멈춰 있다(빛 · 별이 둥실만).

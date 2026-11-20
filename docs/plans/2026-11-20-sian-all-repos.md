---
type: plan
status: approved
tags: [시안, 1.0.0, 서버, 어드민, 앱, 랜딩, 마이, 푸시, 음악, 문의, 업데이트, 공통 상태]
last_reviewed: 2026-11-20
---
# 시안 기준으로 서버 · 어드민 · 앱 · 랜딩을 모두 고친다 (1.0.0)

> 상태: 승인(소유자 2026-11-20 "승인 가자") · 기준 2026-11-20 · 앱 develop `29f9b6c` · 서버 develop `7ed7b42` · 어드민 main `581aa6c` · 랜딩 main `cd7b2e4` · 이 계획은 앱 · 서버의 `docs/plans/2026-11-20-home-me-timing.md`(승인됨, 묶음 A①~A⑤ · S①~S⑦)를 **이어받는다** — 그 파일의 태스크는 그대로 쓰고, 이 파일은 순서 · 바뀐 줄 · 새 묶음만 적는다 · 브랜치 `docs/sian-decisions-2`(결정 055~064 와 이 계획)

## 목표
- 무엇을: 확정 시안(캔버스 https://claude.ai/artifact/Rt33TzPSEe4PdxNRCej3xT · 피그마 `PNrWFsXHhF8crQkLA3SYBn` 의 온보딩 · 홈 · 나 · 시기 · 마이 · 공통 상태 페이지)대로 서버 · 어드민 · 앱 · 랜딩을 고친다. 궁합은 1.1.0(결정 055 · 063).
- 누구를 위해: 1.0.0 을 쓸 사람(매일 다시 열 이유 — 오늘의 하늘 · 이번 달 · 푸시)과 운영하는 소유자(문의 답변 · 최신 버전 · 이벤트 알림).
- 끝나면: 스테이징(app.staging.byeolmyeong.com · 테스트앱)에서 앱이 시안과 같은 화면으로 돌고, 어드민에서 문의에 답하고 최신 버전 · 이벤트 알림을 다루며, 랜딩이 1.0.0 기능(나 · 시기 · 오늘의 하늘 · 공유)을 디딧 랜딩 구조로 소개한다.

## 결정된 전제 (링크만)
- 앱 결정 044 · 045(온보딩 v2, PR #37) · 046~054(홈 · 나 · 시기 · 오늘의 하늘 · 알림함 · 공유 · 이유) · **055~064**(이 브랜치: 궁합 1.1.0 · 탭 넷 / 마이 v2 / 푸시 1.0.0 / 문의 앱 안 / 업데이트 두 단계 / 점검 버튼 없음 / 공통 상태 · 주 버튼 자리 / 음악 세 곡 / 궁합 v2(1.1.0 제안) / 면책 문구).
- 서버 결정 029~038(서버 `origin/docs/home-me-timing-plan`). 새 서버 결정은 039 부터, 마이그레이션은 V26 부터(V22~V25 는 서버 계획이 예약, develop 은 V21 까지).
- 골든 룰: 각 저장소 `docs/golden-rules.md`. 메모리 규칙: CI 통과 뒤에만 합친다(무료 요금제라 규칙으로 못 막는다 — 합치기 전 직접 확인).
- 디딧 랜딩(참고): `~/workspace/didit/didit/app/pages/index.vue` · `app/components/landing/`(Hero → Problem "Why" → Flow "How it works"(단계별 화면) → Feature(카드 셋) → CTA "Download"(스토어 · QR) → Footer).

## 인터뷰 결과 · 내 결정
| 질문 | 답 | 영향 |
|---|---|---|
| 휴대폰 푸시를 1.0.0 에? | 넣는다 | 결정 057 활성. 서버 S⑩ · 앱 A⑧ · 어드민 D② 가 생긴다. 051 의 4 · 052 의 "푸시 없음" 대체 |
| 음원 파일? | 아직 — 자리만 | A⑨ 는 무음 자리표시 파일로 만들고, 파일이 오면 바꿔 끼운다(태스크 하나) |
| 랜딩의 궁합? | 빼기, 1.1.0 때 다시 | L① 에서 메뉴 · 섹션 · FAQ 의 궁합을 지운다 |
| 합치기? | CI 통과하면 내가 합친다 | 묶음마다 PR → CI 확인 → develop 에 합침. main(운영)은 건드리지 않는다 |

내 결정(묻지 않고 고른 기본값):
- 이 계획 파일은 앱 저장소에 둔다(앱이 화면의 원본). 서버 · 어드민 · 랜딩의 결정은 그 저장소 `docs/decisions/` 에 그 묶음을 할 때 쓴다.
- 푸시는 Expo 푸시 서비스로 보낸다(서버가 `https://exp.host/--/api/v2/push/send` 를 부른다). APNs 키 · FCM 서버 키는 EAS 가 들고 있고 서버에는 Expo 접근 토큰 하나(`EXPO_ACCESS_TOKEN`)만 둔다.
- 받는 시간 · 오늘의 하늘 알림 켜기는 **서버**에 둔다(서버가 보내므로). 음악 설정은 **기기**에만 둔다.
- 오늘의 하늘 아침 알림: 서버가 5분마다 "받는 시간 30분 전" 인 켠 사람의 그날 것을 미리 만들고, 받는 시간에 보낸다(한국 시각). 미리 만들기가 실패하면 알림 없이 둔다(열 때 만든다 — 051).
- 문의 종류는 새로 BUG · IDEA · ACCOUNT · ETC. 옛 READING · SYNASTRY · OTHER 줄은 그대로 두고 앱은 "기타" 로 보인다.
- 무음 자리표시 음원은 파이썬 `wave` 로 만든 1초 WAV(ffmpeg 없음).
- 랜딩 화면 그림은 캔버스 보드를 크롬으로 2배 찍은 PNG(`public/screens/`)로 쓴다. 스토어 링크가 아직 없으면 다운로드 자리에 "곧 만나요" + 웹 앱 버튼(app.byeolmyeong.com).
- 1.0.0 의 궁합 코드는 지우지 않고 진입점만 없앤다(055 의 1).

## 범위 밖
- 1.1.0: 궁합 새 화면(063) · 결제 · 광고 · 유료 자리. 효과음. 대화형 문의. 운영(main) 배포 · 스토어 제출(사람이 확인). 음원 제작 · 사용권.

## 전역 제약 (모든 태스크에 암묵 적용)
- 앱: Node 22 · Expo SDK 58 · 패키지는 `npx expo install` 만 · 문구 `src/content/strings.ts` · 색 · 간격 `src/constants/theme.ts` · 앱에서 점성 계산 금지 · 기능끼리 import 금지(`SHARED_FEATURE_FILES` 예외) · 외부 응답은 검사 함수로 막는다.
- 서버: Kotlin · Spring Boot · PostgreSQL · Flyway V26~ · 서버 결정 039~ · 통합 테스트는 Testcontainers(Docker 필요) · 계약은 `docs/architecture.md` 표가 단일 출처.
- 어드민: Vite · React · `src/content/strings.ts` · `src/styles/tokens.css` · 응답 검사 `src/lib/api/guards.ts` · 계약은 서버 `docs/architecture.md` "관리자 API".
- 랜딩: Nuxt · 어두운 브랜드(앱 결정 033 의 색 · Pretendard) · 약관 글 `app/data/legal.ts` 는 건드리지 않는다.
- 공통: 출생 정보를 로그 · 분석 · 공유에 넣지 않는다 · 단정 금지 · 새 동작은 실패하는 테스트 먼저 · 한 태스크 = 한 커밋 · 작업 브랜치 → PR → CI 통과 확인 → develop 합침.

## 순서
| 단계 | 묶음 | 저장소 | 결정 | 기다리는 것 |
|---|---|---|---|---|
| 0 | P① 문서 합치기 · P② 내 하늘 지도 · P③ 온보딩 v2 · P④ 서버 S① | 앱 · 서버 | 044~064 · 서버 029~038 | Docker(P④) |
| 1 | S① → A①(탭 넷) | 서버 → 앱 | 046 · 047 · 055 | P④ |
| 2 | A⑥ 공통 상태 · 업데이트 두 단계 · 점검 | 앱 (+서버 S⑧ 의 latestVersion) | 059 · 060 · 061 | 없음(latestVersion 은 S⑧ 뒤 켠다) |
| 3 | S② → A② | 서버 → 앱 | 048 · 050 · 054 | P② · P③ |
| 4 | S③ · S④ → A③ | 서버 → 앱 | 049 · 050 | — |
| 5 | S⑤(+문의 답변 종류) → A④ | 서버 → 앱 | 051 · 052 · 058 | — |
| 6 | S⑧ 문의 v2 · 최신 버전 → D① → A⑦ 마이 v2 · 문의 | 서버 → 어드민 → 앱 | 056 · 058 · 059 | S⑤ |
| 7 | S⑨ 출생 정보 바꾸기 | 서버 | 056 의 6 | — |
| 8 | S⑥ → A⑤ 공유 | 서버 → 앱 | 053 | Meta 앱 ID(소유자) |
| 9 | S⑩ 푸시 → D② → A⑧ 푸시 · A⑨ 음악 | 서버 → 어드민 → 앱 | 057 · 062 | APNs · FCM 을 EAS 에(소유자), 새 개발 빌드 |
| 10 | L① 랜딩 | 랜딩 | 055 | 없음(언제든) |
| 11 | S⑦ 옛 경로 정리 · 마무리 문서 · 새 테스트앱 빌드 | 서버 · 앱 | — | 새 테스트앱 설치 확인(사람) |

## 이어받는 계획에서 바뀌는 줄 (앱 `docs/plans/2026-11-20-home-me-timing.md`)
- 태스크 1 · 2 · 4 · 5: 탭 **넷**(홈 · 나 · 시기 · 마이), `MainTab = 'home' | 'me' | 'timing' | 'my'`, 궁합 대상 없음(결정 055). 태스크 3: 궁합 칸 자리 없음.
- 태스크 26 · 28(알림함): 종류에 `INQUIRY_ANSWERED`(→ 답변 보기 `/my/inquiries/<id>`) 를 더하고 `SYNASTRY_REPORT_DONE` 은 숨긴다(055 · 058). 휴대폰 푸시는 A⑧.
- 태스크 31(공유): 궁합 카드는 만들지 않는다(055 의 6).
- 태스크 12(내 별명) · 13(나 탭) · 27(오늘의 하늘) · 23(그날의 하늘): 화면 아래 면책 문구를 두지 않는다(결정 064). 쓰는 중 · 못 썼을 때 화면은 A⑥ 의 `StateScreen` 을 쓴다(결정 061 — 열린 항목 2 를 닫는다).
- "범위 밖" 의 휴대폰 푸시 · 오늘의 하늘 알림 켜기/끄기 · 아침 미리 만들기는 이 계획의 S⑩ · A⑧ 로 들어온다.
- 서버 계획(서버 저장소 같은 이름): S⑤ 의 알림 종류에 `INQUIRY_ANSWERED` 를 더한다(S⑧ 이 만든다).

## 태스크

### 0. 먼저 들어갈 것

#### P1. merge-docs-branches · 상태: 진행
- 읽을 것: 앱 `origin/docs/home-me-timing-plan` · `docs/sian-decisions-2`, 서버 `origin/docs/home-me-timing-plan`
- 할 것: 앱 `docs/sian-decisions-2`(결정 055~064 · 이 계획 — 위 브랜치를 품는다)를 푸시하고 develop 으로 PR. 서버 `docs/home-me-timing-plan` 도 develop 으로 PR. 문서만이다.
- 하지 말 것: 코드를 섞지 않는다. 이유: 문서 PR 은 바로 합칠 수 있어야 한다.
- 검증: 두 PR 의 CI 통과(`gh pr checks <번호>`) → 합침 → `git log origin/develop -1` 에 머지 커밋.

#### P2. sky-map-pr · 상태: 대기
- 읽을 것: 앱 로컬 `feat/sky-map`(내 하늘 지도 13 · 13-1 · 13-2, 계획 `docs/plans/2026-11-20-sky-map.md`)
- 할 것: develop 위로 다시 올려(rebase) 충돌을 풀고 `/verify` → 푸시 → PR.
- 검증: `npm test` · `npx tsc --noEmit && npx expo lint` 통과 · CI 통과 → 합침.

#### P3. onboarding-v2-final · 상태: 대기
- 읽을 것: PR #37(`feat/onboarding-v2`, 결정 044 · 045), 결정 055 의 5, 시안 온보딩 1(점 1/2) · 3(점 2/2) · 8-1(시트 제목 없음)
- 할 것: 소개를 두 장(나 → 시기)으로, 궁합 장을 뺀다. 태어난 시각 시트의 제목을 뺀다(결정 056 의 9). 보드와 나란히 웹 스크린샷.
- 하지 말 것: 044 · 045 의 나머지 동작을 바꾸지 않는다.
- 검증: 소개 점 1/2 · 2/2 렌더 테스트, 시트에 제목 없음 테스트, CI 통과 → 합침.

#### P4. server-s1 · 상태: 대기 (Docker 필요)
- 읽을 것: 서버 로컬 `feat/structured-basis`(S① 근거 구조 · 요약 해석 v2 · "~기"), 서버 계획 S①
- 할 것: Docker 를 띄워 `./gradlew build`(통합 테스트 포함)를 돌리고, 통과하면 푸시 → PR.
- 검증: `./gradlew build` BUILD SUCCESSFUL · CI 통과 → 합침. Docker 가 안 뜨면 **차단**(소유자가 Docker Desktop 을 다시 켠다).

### 1~5, 8. 이어받는 묶음
- S① · A① · S② · A② · S③ · S④ · A③ · S⑤ · A④ · S⑥ · A⑤ · S⑦ 은 앱 · 서버 `docs/plans/2026-11-20-home-me-timing.md` 의 태스크 그대로(위 "바뀌는 줄" 반영). 묶음마다 PR · CI 확인 · 합침.

### A⑥ 공통 상태 · 업데이트 두 단계 · 점검 (앱 `feat/common-states`)

#### A6-1. state-screen · 상태: 대기
- 읽을 것: 결정 061, 캔버스 11-9 · 14-8 · 19 · 20-1, `src/components/status-view.tsx`, `src/features/reading/making-view.tsx`(별 그림)
- 할 것: `src/components/state-screen.tsx` — `StateScreen({ title, body, primary?: { label, onPress }, later?: { label, onPress }, withTabs?: boolean })`. 별이 그림 · 제목 · 두 줄 설명 · 맨 아래 주 버튼(아래 34, `withTabs` 면 탭 위) · 그 위 글자 버튼. `src/components/offline-banner.tsx` — `OfflineBanner()`(머리 아래 띠). 문구는 `strings.states`.
- 주는 것: `StateScreen` · `OfflineBanner`
- 하지 말 것: 화면마다 따로 그리지 않는다. 이유: 결정 061.
- 검증: 렌더 테스트(버튼 있음/없음 · 탭 있음), `npx tsc --noEmit`.

#### A6-2. load-fail-offline · 상태: 대기
- 읽을 것: A6-1, 결정 061 의 3 · 4, `src/lib/api.ts`(네트워크 오류 구분), 홈 · 나 · 시기 화면
- 할 것: 화면 전체 불러오기 실패 → `StateScreen withTabs`("다시 보기"), 카드 하나 실패 → 카드 자리 안내, 네트워크 끊김 → 받아 둔 것 + `OfflineBanner`, 받아 둔 것이 없으면 `StateScreen`("다시 시도"). 연결 상태는 `@react-native-community/netinfo`(`npx expo install`)로 안다.
- 검증: 상태별 렌더 테스트(실패 · 끊김 · 되살아남), 연결이 돌아오면 띠가 사라지고 다시 부르는지 테스트.

#### A6-3. update-two-steps · 상태: 대기
- 읽을 것: 결정 027 · 059, `src/features/update/`(version.ts · update-store.ts · update-gate.tsx · update-required.tsx), `src/lib/api.ts` 의 `getAppConfig`
- 할 것: `AppConfig` 플랫폼 값에 `latestVersion: string | null`(없으면 null — 옛 서버). 권유 판정 `shouldSuggestUpdate(current, latest, min, lastAsked)`. 권유 창(가운데 창 · "나중에" / "업데이트") — 같은 `latestVersion` 은 한 번(물은 버전을 `byeolmyeong.updateAsked.v1` 에), 바쁨 · 로그인 전 · 가입 중엔 미룸. 막는 화면은 `StateScreen` 모양 + 문구 "새 버전이 나왔어요" · 버튼 "업데이트".
- 하지 말 것: 027 의 판정 · 바쁨 · 426 을 바꾸지 않는다.
- 검증: 판정 표 테스트(낮음/같음/높음 · null · 읽을 수 없는 버전 · 이미 물음), 렌더 테스트.

#### A6-4. maintenance-auto · 상태: 대기
- 읽을 것: 결정 030 · 060, `src/features/update/maintenance-notice.tsx`
- 할 것: 점검 화면을 `StateScreen`(버튼 없음)으로, 떠 있는 동안 60초마다 · 앞으로 돌아올 때 `GET /app-config`. 풀리면 사라진다.
- 검증: 가짜 타이머로 60초 뒤 다시 부르는지 · 풀리면 사라지는지 테스트.

#### A6-5. verify-a6 · 상태: 대기
- 할 것: `/verify`, 웹에서 19 · 20 · 17 · 18 상태를 가짜 서버로 띄워 캔버스 보드와 나란히 스크린샷. PR → CI → 합침.

### S⑧ 문의 v2 · 최신 버전 (서버 `feat/inquiry-v2`)

#### S8-1. decision-039-040 · 상태: 대기
- 할 것: 서버 결정 039(문의 답변: 답 칸 · 내 문의 목록 · 종류 · 알림 `INQUIRY_ANSWERED`, 앱 결정 058) · 040(app-config `latestVersion`, 앱 결정 059). 서버 결정 014 · 관련 결정 앞머리 표시.
- 검증: 파일 둘 · 앞머리 표시.

#### S8-2. inquiry-answers · 상태: 대기
- 읽을 것: S8-1, `inquiry/`(Inquiry.kt · InquiryService · InquiryController · Repository), `admin/AdminInquiry*`
- 할 것: V26 `inquiries` 에 `answer_body text null` · `answered_at timestamptz null`. `POST /inquiries` 종류 BUG · IDEA · ACCOUNT · ETC(옛 값은 읽기만), 내용 10~1000자, `replyEmail` 은 받지 않는다(와도 무시). `GET /inquiries`(내 것, 최신순) · `GET /inquiries/{id}`(남의 것 404). 관리자 `PATCH /admin/inquiries/{id}` 에 `answer`(1~2000자) — 저장하면 상태 ANSWERED · `answered_at` · 알림 `INQUIRY_ANSWERED { inquiryId }` 한 건(S⑤ 의 알림 표, S⑩ 이 있으면 푸시도). 감사 로그.
- 하지 말 것: 남의 문의를 보이지 않는다(소유자 검사). 답을 고치면 알림을 다시 만들지 않는다(처음 답할 때 한 번).
- 검증: 통합 테스트(내 목록 · 남의 것 404 · 답하면 알림 1건 · 다시 고치면 0건 · 옛 종류 줄 읽힘), `./gradlew build`.

#### S8-3. app-config-latest · 상태: 대기
- 할 것: V26(같은 파일 또는 V27) 플랫폼 설정에 `latest_version`. `GET /app-config` 에 `latestVersion`, 관리자 앱 설정 PUT 에 `latestVersion`(버전 모양 검사, `minVersion` 보다 낮으면 400 `LATEST_BELOW_MIN`).
- 검증: 통합 테스트 · `docs/architecture.md` 표 · PR → CI → 합침.

### D① 어드민 문의 답변 · 최신 버전 (어드민 `feat/inquiry-answer`)

#### D1-1. inquiry-answer-ui · 상태: 대기
- 읽을 것: S8-2 계약, `src/features/inquiries/InquiryDetailPage.tsx` · `labels.ts` · `src/lib/api/`
- 할 것: 상세에 "답변" 칸(1~2000자, 글자 수) + "답변 보내기"(저장 → ANSWERED). 답한 문의는 답과 시각을 보이고 고칠 수 있다(알림은 다시 가지 않는다는 안내). 답장 이메일 칸 · mailto 는 옛 문의에만 보인다. 새 종류 이름표.
- 검증: 화면 테스트(보내기 · 빈 답 막기 · 옛 문의) · `npx tsc --noEmit` · `npm run lint` · `npm test`.

#### D1-2. app-config-latest-ui · 상태: 대기
- 할 것: `AppConfigPage` 플랫폼마다 "최신 버전" 칸(최소 버전보다 낮으면 안내). guards 에 `latestVersion`.
- 검증: 화면 테스트 · PR → CI → 합침.

### A⑦ 마이 v2 · 문의 앱 안 (앱 `feat/my-v2`)

#### A7-1. my-main · 상태: 대기
- 읽을 것: 결정 056, 캔버스 16 · 16-1, `src/app/my.tsx`, 홈 별명 카드(A① 태스크 3)
- 할 것: 마이 = 별명 카드(별자리 그림 · 닉네임 · "○○자리 · 별명을 받은 지 N일" · 한 줄 별명 · 출생 정보 한 줄 · 버튼 "계정 · 프로필" · "출생 정보 바꾸기") + 카드 둘(알림(받는 시간) · 음악 · 자주 묻는 질문 · 문의하기 / 이용약관 · 개인정보 처리방침 · 앱 버전 숫자). 로그아웃 · 계정 삭제 줄을 뺀다. 경로: `/my/account` · `/my/notifications` · `/my/music` · `/my/birth` · `/settings/faq` · `/my/inquiries` · `/settings/terms` · `/settings/privacy`.
- 검증: 렌더 테스트(시각 모름 · createdAt 없음), 링크 대상 표 테스트.

#### A7-2. account-screens · 상태: 대기
- 읽을 것: 결정 056 의 3 · 7 · 8, 캔버스 16-1 · 16-5 · 16-6 · 16-9 · 16-10, `PATCH /account` · `DELETE /account`(서버 계약)
- 할 것: `/my/account`(프로필 그림 → 시트 · 닉네임 → `/my/nickname` · 연결된 계정 · 로그아웃(가운데 창) · 계정 삭제 작은 글자 → `/my/delete`). 닉네임 화면(이름표 없음, 409 `NICKNAME_TAKEN` 안내). 프로필 시트는 온보딩 7-4 의 부품을 다시 쓴다(8개, 제목 없음). 계정 삭제(지워지는 것 넷 · 체크 · 위험 버튼) → "계정을 지웠어요" → "확인" 은 `/login`.
- 검증: 화면 테스트(닉네임 400 · 409, 체크 전 버튼 꺼짐, 삭제 뒤 로그인으로).

#### A7-3. birth-change · 상태: 대기 (S⑨ 뒤)
- 읽을 것: 결정 056 의 6, 캔버스 16-4 · 16-4 확인, 온보딩 8 의 입력 부품, S⑨ 계약
- 할 것: `/my/birth` — 안내 + 입력 + 가운데 확인 창 → 저장 → 기기에 둔 별명 · 풀이 · 이번 달 · 오늘의 하늘 보관을 지우고 별명 짓는 중(9)부터.
- 검증: 화면 테스트(확인 창 취소 · 바꾸기 → 보관 지움 · 짓는 중으로).

#### A7-4. inquiry-in-app · 상태: 대기 (S⑧ 뒤)
- 읽을 것: 결정 058, 캔버스 16-8 넷, `src/features/support/`(inquiry.ts · use-inquiry.ts · category-chips.tsx), `src/app/settings/inquiry.tsx`
- 할 것: `/my/inquiries`(내역 · 비면 "아직 문의가 없어요" · 주 버튼 "새 문의하기") · `/my/inquiries/new`(종류 칩 넷 · 내용 10~1000자, 이메일 칸 없음) · 보냄 화면 · `/my/inquiries/[id]`(내 문의 + 답변 카드). `src/app/settings/inquiry.tsx` 는 `/my/inquiries/new` 로 보낸다. API: `getInquiries` · `getInquiry` · `postInquiry`(종류 새 값) + 검사 함수.
- 검증: 검사 함수 테스트(모르는 종류 → 기타) · 화면 테스트 · 알림 `INQUIRY_ANSWERED` 를 누르면 그 답변으로(A④ 의 표).

#### A7-5. sheets-no-title · verify-a7 · 상태: 대기
- 할 것: 앱의 시트에서 제목 줄을 뺀다(받는 시간 · 프로필 · 태어난 시각 · 공유). `/verify`, 16 ~ 16-10 보드와 나란히 웹 스크린샷 → PR → CI → 합침.

### S⑨ 출생 정보 바꾸기 (서버 `feat/birth-change`)

#### S9-1. birth-change-regenerate · 상태: 대기
- 읽을 것: 결정 056 의 6, `profile/` · `birth.BirthProfileService`, 서버 결정 029(풀이 분리) · 032 · 034
- 할 것: 서버 결정 041. `PUT /profile` 로 출생 정보가 **바뀌면** 그 계정의 별명(요약 해석) · 나 탭 풀이 · 시기 풀이 · 그날의/오늘의 하늘 저장분을 지운다(이번 달은 요청 때 계산이라 없음). 별명은 앱이 다시 `POST /readings`. 같은 값이면 아무것도 지우지 않는다. 1.1.0 유료 풀이는 "다시 받기 권리" 를 1.1.0 계획에서 정한다(지금은 무료).
- 하지 말 것: 공유 스냅샷(`shares`)은 지우지 않는다(이미 나간 링크).
- 검증: 통합 테스트(바뀜 → 지워짐 · 같음 → 그대로 · 남의 것 영향 없음) → PR → CI → 합침.

### S⑩ 푸시 (서버 `feat/push`)

#### S10-1. decision-042 · 상태: 대기
- 할 것: 서버 결정 042 — 기기 토큰 · 보내는 종류 · 받는 시간 · 미리 만들기 · Expo 푸시 · 실패 처리(앱 결정 057).

#### S10-2. device-tokens-settings · 상태: 대기
- 할 것: V27 `push_devices(account_id, expo_token unique, platform, created_at, last_seen_at)`, 계정에 `today_sky_push boolean`(기본 = `push_consent`) · `today_sky_time time`(기본 08:00). `POST /push/devices { expoToken, platform }`(같은 토큰이면 계정 · 시각만 갱신) · `DELETE /push/devices/{token}`. `GET`/`PATCH /account` 에 `todaySkyPush` · `todaySkyTime`(HH:mm, 5분 단위).
- 하지 말 것: 토큰을 로그에 통째로 쓰지 않는다.
- 검증: 통합 테스트(등록 · 중복 · 다른 계정이 같은 토큰 → 옮김 · 계정 삭제 시 지움).

#### S10-3. sender-and-events · 상태: 대기
- 할 것: `push/ExpoPushClient`(묶어 보내기 · `DeviceNotRegistered` 면 토큰 지움 · 실패는 구조화 로그). 보내는 때: 별명 지음 · 나 탭 풀이 완성 · 시기 풀이 완성 · 문의 답변(늘) — 알림함 이벤트(S⑤)와 같은 곳에서. 문구는 서버 `push/PushMessages`(앱 strings 와 같은 말).
- 검증: 단위 테스트(가짜 Expo 응답 · 토큰 지움) · 통합 테스트(이벤트 → 보내기 한 번).

#### S10-4. today-sky-schedule · 상태: 대기
- 할 것: 5분마다 도는 작업: 한국 시각으로 받는 시간 30분 전인 켠 사람의 오늘의 하늘을 미리 만든다(S④ 의 생성 그대로, 이미 있으면 건너뜀) · 받는 시간이 된 사람에게 보낸다(그날 한 번, 보낸 날 기록). 여러 서버에서 겹치지 않게 DB 잠금.
- 검증: 시계를 바꿔 끼운 통합 테스트(30분 전 생성 · 정각 발송 · 같은 날 두 번 안 감 · 끈 사람 0건).

#### S10-5. admin-event-push · 상태: 대기
- 할 것: `POST /admin/push/events { title, body }` — 마케팅 동의한 계정에만, 감사 로그, 하루 한 번 제한. 계약 표 · PR → CI → 합침.
- 검증: 통합 테스트(동의 안 한 사람 0건 · 감사 로그).

### D② 어드민 이벤트 알림 (어드민 `feat/event-push`)

#### D2-1. event-push-page · 상태: 대기
- 할 것: 구역 "이벤트 알림" — 제목 · 본문 · 미리보기 · 보내기 확인 창(받는 사람 수). `sections.tsx` 한 줄.
- 검증: 화면 테스트 · CI → 합침.

### A⑧ 푸시 · A⑨ 음악 (앱 `feat/push-music`, 새 개발 빌드 하나로)

#### A8-1. push-register · 상태: 대기
- 읽을 것: 결정 057, S10-2 계약, Expo SDK 58 `expo-notifications` 문서(https://docs.expo.dev/versions/v58.0.0/sdk/notifications/)
- 할 것: `npx expo install expo-notifications expo-device`, `src/features/push/`(권한 요청 · 토큰 받아 `POST /push/devices` · 로그아웃 때 `DELETE`). 권한은 별명을 받은 뒤 처음 홈에서 한 번 묻는다(가입 때 푸시 동의한 사람만). 알림을 누르면 종류별 화면(알림함 표와 같은 곳). 웹에서는 아무것도 하지 않는다.
- 검증: 단위 테스트(웹 무시 · 동의 안 함 → 묻지 않음 · 누르면 이동 표).

#### A8-2. my-notifications · 상태: 대기
- 할 것: `/my/notifications`(오늘의 하늘 알림 · 받는 시간 → 시트(8-1 모양, 5분 단위) · 이벤트 · 혜택 알림 = `marketingConsent`) → `PATCH /account`. 마이 첫 줄 오른쪽에 받는 시간(끄면 숨김).
- 검증: 화면 테스트(켜기/끄기 · 시간 저장 · 실패 시 되돌림).

#### A9-1. audio · 상태: 대기
- 읽을 것: 결정 062, Expo SDK 58 `expo-audio` 문서
- 할 것: `npx expo install expo-audio`, `assets/audio/` 에 무음 자리표시 셋(`opening.wav` · `waiting.wav` · `background.wav`, 파이썬 `wave` 로 1초) + 바꿔 끼우는 법을 `assets/audio/README.md` 에. `src/features/audio/`(`useSoundtrack(track: 'opening' | 'waiting' | 'background')` · 설정 `byeolmyeong.music.v1 { background, opening, waiting }` 기본 모두 켬 · 무음 모드 존중 · 다른 소리와 섞기(끼어들지 않음) · 뒤로 가면 멈춤 · 넘어갈 때 짧게 줄였다 키움). 쓰는 중 화면들은 `waiting`, 스플래시는 `opening`, 나머지는 `background`. 웹은 처음 누른 뒤부터 배경만.
- 검증: 단위 테스트(설정 끔 → 안 틂 · 화면 전환 표 · 웹 첫 누름 전 무음).

#### A9-2. my-music · verify-a8-a9 · 상태: 대기
- 할 것: `/my/music` 스위치 셋. `/verify` · 새 개발 빌드(`npx eas-cli@latest build --profile development`)로 기기에서 푸시 한 번 · 음악 전환 확인 → PR → CI → 합침.
- 검증: 기기 확인은 **차단 가능**(APNs · FCM 이 EAS 에 없으면 소유자).

#### A9-3. real-tracks · 상태: 대기(음원이 오면)
- 할 것: 받은 파일 셋을 `assets/audio/` 에 같은 이름으로 바꿔 끼운다(형식이 다르면 이름표만 바꿈). 크기 확인.

### L① 랜딩 (랜딩 `feat/landing-v2`, 디딧 구조)

#### L1-1. landing-structure · 상태: 대기
- 읽을 것: 디딧 `~/workspace/didit/didit/app/components/landing/*.vue`(구조 · 움직임만 참고), 랜딩 `app/pages/index.vue` · `app/components/` · `app/data/faq.ts`, 앱 결정 033(색 · 글꼴) · 055
- 할 것: `app/components/landing/` 에 `HeroSection`(한 줄 소개 + 폰 화면 그림 + 다운로드/웹 앱 버튼) · `WhySection`(점성술이 어려운 이유 셋 → 별명이 푸는 법) · `FlowSection`(이렇게 써요: 출생 정보 → 별명 공개 → 홈 · 오늘의 하늘 → 나 · 시기, 단계마다 화면 그림이 바뀜) · `FeatureSection`(주요 기능 카드: 내 별명 · 나(칩 다섯) · 시기(이번 달 · 올해 · 인생) · 오늘의 하늘 · 공유 — 내 하늘 지도 포함) · `CTASection`(다운로드 · 스토어 링크가 없으면 "곧 만나요" + 웹 앱) · `FooterSection`(약관 셋 · 문의는 앱 안). `index.vue` 는 섹션을 차례로 놓는다. 궁합 메뉴 · 섹션을 지운다. 메타(제목 · 설명 · og)에서 궁합을 빼고 1.0.0 기능으로.
- 하지 말 것: 디딧의 글 · 그림 · 상표를 가져오지 않는다(구조 · 레이아웃만). 약관 페이지를 건드리지 않는다.
- 검증: `npm run build` 통과 · 데스크톱 1440 · 폰 390 스크린샷.

#### L1-2. landing-screens-faq · 상태: 대기
- 할 것: 캔버스 보드(홈 11 · 내 별명 12 · 나 탭 칩 · 시기 14 · 오늘의 하늘 11-4 · 별명 공개 10)를 크롬으로 2배 찍어 `public/screens/*.png`(webp 가능). FAQ: 궁합 질문을 빼고 "자세한 풀이" · "오늘의 하늘" · "푸시 알림" · "무료예요?(1.0.0 무료, 1.1.0 부터 자세한 풀이 유료)" 를 시안 말로.
- 검증: 빌드 · 그림 용량(한 장 500KB 아래) · 스크린샷 → PR → CI → 합침(Vercel 프리뷰 확인).

### 11. 마무리

#### Z1. docs-release · 상태: 대기
- 할 것: 앱 docs/release-1.0.0.md(F5 · F6 → 1.1.0, 화면 표 · 푸시 · 음악 · 마이 · 공통 상태) · docs/product.md(판 나누기) · docs/architecture.md(새 기능 폴더 audio · push · my) · CLAUDE.md(features 목록). 서버 · 어드민 문서의 계약 표.
- 검증: `grep -n '궁합' docs/release-1.0.0.md` 가 1.1.0 절에만.

#### Z2. final-verify-testapp · 상태: 대기
- 할 것: 네 저장소 검증 명령 전부 · 스테이징 웹에서 홈 → 나 → 시기 → 마이 → 문의 → 알림함 한 바퀴 · 새 테스트앱 빌드(`--profile test`). TestFlight 제출은 소유자 확인 뒤.
- 검증: 아래 "검증" 표 전부.

## 검증 (전체 완료 판정)
| 저장소 | 명령 | 기대 |
|---|---|---|
| 앱 | `npm test` · `npx tsc --noEmit && npx expo lint` · `npx expo export --platform web` | 모두 통과 |
| 서버 | `./gradlew build` | BUILD SUCCESSFUL(통합 테스트 포함) |
| 어드민 | `npx tsc --noEmit` · `npm run lint` · `npm test` · `npm run build` | 모두 통과 |
| 랜딩 | `npm run build` | 통과 |
| 화면 | 스테이징 웹 스크린샷을 캔버스 보드와 나란히 | 보드마다 같은 구성 |

## 리뷰 초점 (어느 태스크의 테스트도 안 치는 것 → 소유 태스크에 테스트를 보탠다)
1. 출생 정보를 바꾼 직후 기기 보관(별명 · 풀이)이 옛 것을 보여 주지 않는가 → A7-3 · S9-1.
2. 같은 날 오늘의 하늘 푸시가 두 번 가지 않는가(서버 두 대 · 재시작) → S10-4.
3. 계정 삭제 뒤 그 기기 토큰으로 푸시가 가지 않는가 → S10-2.
4. 권유 창이 가입 중 · 바쁜 화면 · 점검 화면 위에 뜨지 않는가 → A6-3.
5. 1.0.0 빌드 어디에서도 궁합 화면으로 갈 수 없는가(딥 링크 `/synastry` 포함 — 열면 홈으로) → A①.

## 자동 반복
- 하지 않는다. 묶음마다 PR · CI 확인 · 합침이 사람 쪽 판단(소유자가 "CI 통과하면 합치기" 를 맡겼다)을 품고, 외부 설정(Docker · APNs · Meta) 차단이 섞여 있다. 묶음 하나가 끝나면 한 줄로 보고하고 다음 묶음으로 간다.

## 위험 · 되돌리기
- 푸시 비용 · 실수 발송: 이벤트 알림은 하루 한 번 · 확인 창 · 감사 로그. 되돌리기 — 서버 설정으로 발송 끔(S10-1 결정에 스위치).
- 아침 미리 만들기 AI 비용: 켠 사람 수 × 하루 1회. 되돌리기 — 스케줄러 끔(열 때 만들기로 돌아감).
- 마이그레이션 V26 · V27 은 칸 더하기뿐(지우지 않음). 옛 칸 정리는 S⑦.
- develop 합침은 스테이징에 바로 나간다 — 묶음마다 스테이징 확인.

## 실행 기록
(아직 없음)

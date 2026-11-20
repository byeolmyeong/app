---
type: plan
status: approved
tags: [온보딩, 로그인, 약관 보기, 별명 공개, 디자인 시안]
last_reviewed: 2026-11-20
---
# 확정 시안으로 온보딩 다시 맞추기 — 로그인 문구 · 최근 로그인 · 약관 보기 · 별명 공개

> 상태: 승인(소유자 2026-11-20 "지금 시안 나온 거 확정이니까 온보딩부터 다시 시안 있는 대로 작업해") · 기준 develop `29f9b6c` · 브랜치 `feat/onboarding-v2`
> 시안: 피그마 「별명」 › 디자인(https://www.figma.com/design/5fLCBAvxiPmAc7XsCR1zPb, 확정) · HTML 원본 캔버스 https://claude.ai/artifact/Rt33TzPSEe4PdxNRCej3xT (버전 1795141378). 피그마 보드는 이 캔버스를 옮긴 것이라 값은 HTML 원본에서 읽는다.

## 목표
- 무엇을: 2026-11-19 에 만든 온보딩(결정 042)을 11-20 확정 시안과 같게 한다. 바뀐 보드는 5 · 5-1(로그인 문구), 3(소개 둘째 장 본문), 6 · 6-1(약관 "보기"가 6-2 로 감)이고, 새 보드는 5-2(최근 로그인) · 6-2(약관 보기) · 10(별명 공개)이다. 나머지 19개 보드는 어제와 같다(HTML 비교 — 닉네임 쪽 5개는 태그 표기만 다름).
- 끝나면: 로그인 버튼 문구가 셋 다 "○○로 로그인", 로그아웃 뒤 다시 오면 마지막에 쓴 버튼에 "최근 로그인" 배지, 약관 "보기"는 6-2 모양이고 가입 중에는 "동의하기"로 그 항목을 켠다, 가입 뒤 별명이 지어지면 별명 공개(10)를 거쳐 풀이로 간다.

## 결정된 전제
- 결정 042(단계식 온보딩) · 043(앱 안 약관 글 — 글은 랜딩과 같은 원본 `src/content/legal.ts`, 시안 6-2 의 글은 자리표시라 쓰지 않는다).
- 로그인 버튼 문구(소유자 2026-11-20, 캔버스 메모): **"Kakao로 로그인" · "Apple로 로그인" · "Google로 로그인"** — 영문 이름 + "로 로그인" 으로 셋 통일. 카카오 가이드의 "카카오 로그인", 구글 공식 한국어 "Google 계정으로 로그인" 과 다르다 → 결정 문서에 적는다(태스크 1).
- 서버 변경 없음: 별명 한 줄은 풀이의 `headline`, 해 · 달은 `Chart.positions`(SUN · MOON), 첫인상은 `Chart.angles.asc`(시각 "모름"이면 없다).

## 내 결정 (묻지 않고 고른 기본값)
- 최근 로그인: 로그인에 성공하면 공급자를 기기 저장소(AsyncStorage)의 `byeolmyeong-device.lastProvider.v1` 에 둔다. 사람이 아니라 기기에 붙는 값이라 로그아웃 · 탈퇴가 지우지 않는다(소개 키와 같은 규칙, `byeolmyeong-device.` 머리). 공급자 이름만 두고 계정 정보는 두지 않는다.
- 웹 구글 버튼은 계획 042 대로 구글이 그리는 GIS 라 글자를 못 바꾼다. GIS 옵션 `text: 'signin_with'` 로 "로그인" 쪽 문구가 나오게만 한다. 배지는 GIS 버튼을 감싼 칸 위에 얹는다.
- 별명 공개(10)는 **가입 직후 처음 한 번만**(보드 이름). `/reading?from=signup` 에서 풀이가 다 지어지면 공개 화면을 보이고, "풀이 읽기"를 누르면 지금의 풀이 글로 간다(나 탭 12 는 다음 계획 — 생기면 그쪽으로 바꾼다). 시각 "모름"이면 첫인상 칸을 빼고 둘만 가운데 정렬(골든 룰: 시각 모름이면 상승궁을 보여 주지 않는다). 달 별자리가 그날 바뀔 수 있으면(`moonSignMayChange`) 앱의 지금 차트 요약과 같은 방식으로 표시한다.
- 약관 보기(6-2)의 "동의하기"는 가입 약관 단계에서 연 경우에만 보인다(마이에서 연 경우는 없음). 누르면 그 항목(이용약관 · 처리방침 · 마케팅)을 켜고 초안에 쓴 뒤 약관 단계로 돌아간다.

## 범위 밖
- 홈(11) · 나 탭(12) · 내 하늘 지도(13) — 다음 계획(백엔드 포함). 시기 탭(캔버스 14 A · B · C)은 비교안이고 피그마에 없어 확정이 아니다.

## 태스크

### 1. adr-onboarding-v2 · 상태: 완료
- 할 것: `docs/decisions/044-onboarding-v2.md`(번호는 모든 원격 브랜치에서 비어 있는지 다시 확인). 로그인 문구 셋(공식 문구와 다름, 심사 · 브랜드 지적 시 되돌릴 값), 최근 로그인 배지, 약관 보기의 동의하기, 별명 공개(가입 직후 한 번, 시각 모름이면 첫인상 없음). 042 앞머리에 "로그인 문구는 044 가 대체".
- 검증: 번호 중복 0.

### 2. login-texts · 상태: 완료
- 할 것: `strings.login.kakao` "Kakao로 로그인" · `apple` "Apple로 로그인" · `google` "Google로 로그인". 웹 GIS `text: 'signin_with'`.
- 검증: 버튼 테스트(문구 셋) 먼저 실패 → 통과. 옛 문구 grep 0건.

### 3. recent-login · 상태: 완료
- 할 것: `src/features/auth/last-provider.ts` — `getLastProvider()` · `setLastProvider(p)`(AsyncStorage, 읽기 실패면 null). 로그인 성공(가입 포함) 때 기록. 로그인 화면은 값이 있으면 그 공급자 버튼에 배지(보드 5-2: 위 −10 · 오른쪽 12, 안쪽 여백 3/9, 모서리 999, 바탕 주색, 바깥 2px 바탕색 고리, 글자 11/15 · 600). 문구 `strings.login.recent` "최근 로그인". 화면 읽기 이름에 "최근 로그인" 을 덧붙인다.
- 검증: 로그인 성공 뒤 값이 남고 로그아웃 · 탈퇴 뒤에도 남는다, 배지는 그 버튼에만, 값이 없으면 배지 없음, 안드로이드에서 마지막이 애플이면 배지 없음.

### 4. intro-copy · 상태: 완료
- 할 것: 소개 둘째 장 본문 "궁합으로 서로 닮은 점과 부딪히는 점을 알아봐요. 연인 · 친구 · 동료 · 가족 모두요."
- 검증: 소개 테스트.

### 5. terms-view · 상태: 완료
- 읽을 것: 보드 6-2(`TermsView.dc.html`), `src/components/text-page.tsx`(결정 043), `src/app/settings/{terms,privacy,marketing}.tsx`, `src/app/signup/terms.tsx`
- 할 것: 글 화면을 6-2 모양으로 — 머리는 가운데 제목(17/24 · 600)과 왼쪽 뒤로, 그 아래 시행일 한 줄(13/18 회색, "시행일 2026년 11월 19일" — 글의 시행일), 조항 제목 15/22 · 600, 문단 14/22 회색(#A9ABB7), 조항 사이 24, 좌우 20. 목록 · 표도 같은 글자 크기. 가입 약관 단계에서 연 경우만 맨 아래에 "동의하기"(56 · 주색, 위로 사라지는 바탕) — 누르면 그 항목을 켜고 초안에 쓴 뒤 돌아간다.
- 검증: 보기 → 동의하기 → 약관 단계에서 그 항목이 켜져 있다(셋 다), 마이에서 열면 동의하기 없음, 글은 그대로(원본 비교 스크립트).

### 6. reveal · 상태: 완료
- 읽을 것: 보드 10(`Reveal.dc.html`), `src/app/reading.tsx`(`from=signup`), `src/features/reading/making-view.tsx`, 차트 · 풀이 타입
- 할 것: `src/features/reading/reveal-view.tsx` — 별이(140) + 뒤 빛 + 반짝임 넷, 아래 "{닉네임} 님의 별명은"(15/22 · 500 회색) · 별명(26/36 · 600, 가운데), 세 칸(나의 중심 · 나의 마음 · 나의 첫인상 — 이름 12/17 회색, 값 16/24 · 600, 칸 폭 104 · 사이 12), 맨 아래 "풀이 읽기"(56 · 주색). 움직임: 그림이 아래에서 떠오름(0.9s, cubic-bezier(.2,.8,.2,1), 150px 아래 · 1.15배에서), 별이 둥실(3.2s) · 빛(3.2s) · 반짝임(2.4s), 글과 칸과 버튼이 차례로 떠오름(0.6s, 지연 0.7 · 1.0 · 1.4 · 1.7s). 동작 줄이기면 멈춘 마지막 장면. 바탕 빛 원 가운데 26%.
- 검증: 가입 직후에만 보이고(다시 열면 풀이 글로 바로), 시각 모름이면 첫인상 칸 없음, 닉네임 · 별명 · 별자리가 서버 값, 동작 줄이기면 애니메이션 없음, "풀이 읽기" → 풀이 글.

### 7. verify · 상태: 대기
- `npx tsc --noEmit && npx expo lint && npm test` + `npx expo export --platform web`. 웹에서 보드 3 · 5 · 5-1(못 하면 테스트) · 5-2 · 6-2 · 10 을 찍어 HTML 원본과 나란히 비교(`scratchpad/compare/tools`). 독립 리뷰.

## 위험 · 되돌리기
- 로그인 문구가 공급자 가이드와 달라 심사 · 브랜드 지적을 받으면 결정 044 에 적은 공식 문구로 되돌린다.
- 새 경로 없음(별명 공개는 풀이 화면 안의 상태) — 브랜치를 버리면 그대로 돌아간다.

## 실행 기록
- 2026-11-20 승인. 워크트리 `.wt-app-onboarding`, 브랜치 `feat/onboarding-v2`(develop `29f9b6c` + 계획 `8564b0e`). 시작 상태: `npx jest` 71 묶음 937 통과, `npx tsc --noEmit` exit 0.
- 태스크 1(결정 044): 전 — 042 의 5 "로그인 버튼 문구는 공급자 가이드 그대로", 최근 로그인 · 약관 보기의 동의하기 · 별명 공개 결정 없음 → 후 — `docs/decisions/044-onboarding-v2.md`(문구 셋과 되돌릴 공식 문구 · 최근 로그인 키 `byeolmyeong-device.lastProvider.v1` 공급자 이름만 · 약관 보기의 동의하기는 가입 중에만 · 별명 공개는 가입 직후 한 번, 시각 모름이면 첫인상 없음, 닉네임은 가입이 받은 값을 메모리에만), 042 앞머리 `superseded_by` 한 줄, DESIGN.md 의 첫 흐름 · 브랜드 자리 · 소셜 버튼 · 애니메이션 줄. 확인: `git fetch` 뒤 모든 ref(원격 · 로컬)의 `docs/decisions/` 에 044 0건 · `git log --all -- 'docs/decisions/044*'` 0줄, 번호 앞 세 자리 중복 0줄. 커밋: 7194deb
- 태스크 2(로그인 문구): 전 — `strings.login` "카카오 로그인" · "Apple로 계속하기" · "Google로 계속하기", 웹 GIS `text: 'continue_with'` → 후 — "Kakao로 로그인" · "Apple로 로그인" · "Google로 로그인", 웹 GIS `text: 'signin_with'`(구글 한국어 "Google 계정으로 로그인"), 문구 주석을 결정 044 로. 확인: `social-button` 문구 셋 테스트 · 새 `google-web.test.tsx`(GIS 옵션) 먼저 2 실패 → `npx jest src/features/auth/providers src/__tests__/login-screen` 32 통과, `grep -rn "카카오 로그인'\|Apple로 계속하기\|Google로 계속하기\|continue_with" src` 0건, `npx tsc --noEmit` · `npx expo lint` exit 0. 커밋: 1b14a08
- 태스크 3(최근 로그인): 전 — 로그인 화면은 어느 공급자를 썼는지 모른다 → 후 — `src/features/auth/last-provider.ts`(`getLastProvider` · `setLastProvider`, 키 `byeolmyeong-device.lastProvider.v1`, 공급자 이름만 · 모르는 값 · 읽기 실패면 null), 세션(`session-store`)이 로그인 성공(`SIGNED_IN`) 때 · 처음 온 사람은 가입을 마칠 때 그 공급자를 적는다(가입권을 받은 공급자를 메모리에 잠시 — 가입을 그만두거나 실패하면 적지 않는다, 개발용 세션도 아님). 버튼 `recent` → `SocialButton` 오른쪽 위 배지(`RecentBadge`: 위 −10 · 오른쪽 12 · 3/9 · 999 · 주색 · 바깥 2px 바탕색 고리 `boxShadow` · `Typography.badge` 11/15 · 600, 값은 `theme.ts` `RecentBadgeStyle`) + 화면 읽기 이름 "○○로 로그인, 최근 로그인", 웹 구글은 GIS 를 감싼 칸(구글이 그린 버튼 폭)에 같은 배지. 로그인 화면이 뜰 때 읽어 그 버튼에만 `recent`. 문구 `strings.login.recent` "최근 로그인". architecture.md 의 기기 키 예외 · auth 줄. 확인: `last-provider` · `session-store` · `social-button` · `google-web` · `login-screen` 테스트를 먼저 써 5 묶음 실패(모듈 없음 · 배지 없음 · 기록 없음) → `npx jest src/__tests__/login-screen src/features/auth` 90 통과(로그인 · 가입을 마친 뒤 값이 남고 로그아웃 · 계정 삭제 뒤에도 남음, 배지는 그 버튼에만, 값이 없으면 없음, 안드로이드에서 마지막이 애플이면 어느 버튼에도 없음). `use-session` 두 테스트는 세션이 AsyncStorage 를 불러 다른 테스트처럼 mock 을 더함, 테마 글자 단계 목록에 `badge`. `npx jest` 73 묶음 951 통과, `npx tsc --noEmit` · `npx expo lint` exit 0. 결정: "로그인 성공(가입 포함)" 을 계정 세션이 생긴 때로 읽음(가입 중 그만두면 적지 않는다) — 틀리면 비용: `signIn` 의 가입권 분기에서 바로 적는 한 줄. 커밋: c6bc1b1
- 태스크 4(소개 둘째 장): 전 — "궁합 점수와 관계 리포트로 서로 닮은 점과 부딪히는 점을 알아봐요. …" → 후 — "궁합으로 서로 닮은 점과 부딪히는 점을 알아봐요. 연인 · 친구 · 동료 · 가족 모두요."(보드 3, `strings.intro.slides[1].body`). 확인: `intro-screen` 새 테스트 먼저 1 실패 → 10 통과, `grep -rn "궁합 점수와 관계 리포트로" src` 0건. 커밋: 8f5b2f2
- 태스크 5(약관 보기 6-2): 전 — 글 화면은 공용 머리(글자 ← · 14 제목) · 조항 제목 18 · 문단 15/24, 동의하기 없음, 약관 단계의 초안은 필수 둘이 다 켜져야 버전을 적음 → 후 — `TextPage`: 머리 56(가운데 제목 `emphasis` 17/24 · 600 · 왼쪽 꺾쇠 40/24), 시행일 한 줄 "시행일 2026년 11월 19일"(`caption` 13/18 · `hint`, 날짜는 `legalInfo.effective`), 머리말 · 조항 제목 `Typography.clause` 15/22 · 600, 문단 · 목록 · 표 `Typography.legal` 14/22(회색), 조항 사이 24 · 제목과 문단 6(`LegalLayout.blockGap`) · 좌우 20 · 위 8. `onAgree` 가 있으면 맨 아래 "동의하기"(`Button` 56 · 주색) — 위 40 은 바탕색으로 사라지는 그라데이션(32% 에서 다 참), 바닥 34. `src/features/auth/signup-agree.ts`(`useSignupAgree(item)`: `?from=signup` 일 때만 동작 — 초안에 그 항목을 켜고 뒤로, 돌아갈 곳이 없으면 `/signup/terms`), 세 글 화면이 이것을 `onAgree` 로. 초안 `draftAgreements` · `writeAgreements` · `agreeInDraft`(이용약관 · 처리방침 버전을 하나씩 적는다 — 하나만 켜도 남고, 둘이 다 있어야 `getDraft()` 가 값을 준다 · 다음 단계 가드는 그대로), 약관 단계는 "보기" 를 `{ pathname, params: { from: 'signup' } }` 로 열고 돌아오면(포커스) 초안의 동의를 다시 읽는다. 문구 `strings.legal.effectiveLabel` · `agree`. DESIGN.md 아이콘 줄(약관 글의 꺾쇠). 확인: `legal-screens`(6-2 값 · 마이에서는 동의하기 없음 · from=signup 이면 56 · 주색) · `legal-back`(진짜 라우터: 보기 → 동의하기 → 약관 단계에서 그 항목만 켜짐 셋 다, 필수 둘을 보기에서 동의하면 다음이 켜짐, 마이에서 연 글은 동의하기 없음) · `terms-step`(보기 주소) 먼저 12 실패 → 통과, `npx jest` 73 묶음 963 통과, 글은 그대로: `node compare-legal.cjs <랜딩 app/data/legal.ts> src/content/legal.ts` "결과: 모두 같다"(privacy 13조 · terms 15조 · marketing 8조), `git diff 29f9b6c -- src/content/legal.ts` 0줄, `npx tsc --noEmit` · `npx expo lint` exit 0. 결정: 시안 6-2 에 없는 머리말과 마지막 시행 문구는 글의 일부라 그대로 둠(시행일 줄 아래 · 맨 끝), 표 머리도 14/22(시안 "목록 · 표도 같은 글자 크기"), 동의하기는 `from=signup` 만 보고 세션 상태는 보지 않음(초안이 메모리라 가입 중이 아니면 쓸 데가 없다) — 틀리면 비용: 훅에서 `useAuth().status` 한 줄. 커밋: fc1a3b2
- 태스크 6(별명 공개): 전 — 가입 뒤 별명 짓는 중이 끝나면 곧장 풀이 글 → 후 — `src/features/reading/reveal-view.tsx`(`RevealView`: 머리 56 빈칸 · 그림 칸 240×220(위 8) 안에 뒤 빛 180 · 반짝임 넷 · 별이 140, "○○ 님의 별명은" `Typography.kicker` 15/22 · 500 회색 · 별명 `hero` 26/36 · 600 가운데(제목) · 세 칸(이름 `statLabel` 12/17 · 400 안내색, 값 `stat` 16/24 · 600, 칸 104 · 사이 12) · 맨 아래 "풀이 읽기" 56 주색, 바탕 빛 `BackdropShape.reveal` 가운데 26% · 0.58, 자리는 `theme.ts` `RevealLayout`). 움직임은 react-native `Animated`: 그림 0.9초 `Easing.bezier(.2,.8,.2,1)` 150 아래 · 1.15배 → 제자리, 글 · 별명 · 칸 · 버튼 0.6초(지연 0.7 · 1.0 · 1.4 · 1.7초, 12 아래 · 투명 → 제자리), 별이 둥실 · 빛 3.2초 · 반짝임 2.4초(지연 0 · 1.1 · 1.8 · 0.6초) — 동작 줄이기면 움직이지 않고 멈춘 마지막 장면(`reduceMotionNow`, 알기 전에는 시작 모습). 별명 짓는 중의 `usePulse` · 뒤 빛 `GlowOrb` 를 내보내 함께 씀. `app/reading.tsx`: `from=signup` 이고 가입 직후 닉네임이 메모리에 있을 때 글(받아 둔 것이든 방금 받은 것이든)이 생기면 공개 — 별명은 풀이 `headline`, 세 칸은 `keyThree(chart)`(차트 요약과 같은 값 · 시각 모름이면 첫인상 없음 · 달 별자리가 그날 바뀔 수 있어도 요약처럼 서버가 준 별자리 그대로), "풀이 읽기" 는 닉네임을 지우고 같은 화면의 풀이 글로. 닉네임: `signup-draft` 의 `finishDraft`(가입 성공 때 초안을 비우고 닉네임만 메모리에) · `signedUpNickname` · `clearSignedUp`, `clearDraft` 도 지운다 — 기기 저장소 · 주소 · 로그에 두지 않는다. 문구 `strings.reveal`(`nicknameSuffix` "님의 별명은" · `read` "풀이 읽기"). architecture.md reading 줄. 확인: `reveal-view`(값 · 칸 둘 · 움직임 설정 · 동작 줄이기면 timing · loop 0회) · `reading-screen`(가입 직후 공개 → 풀이 읽기 → 글, 다시 열면 글로 바로, from 없음 · 닉네임 없음이면 공개 없음, 시각 모름이면 두 칸) · `signup-submit`(가입 뒤 닉네임은 메모리에만 — 기기 저장소에 없음) 먼저 3 묶음 실패 → 49 통과, `npx jest` 74 묶음 972 통과, `npx tsc --noEmit` · `npx expo lint` exit 0. 결정: 닉네임을 돌려주는 서버 응답이 없어(서버 변경 없음) 가입 요청이 받은 값을 메모리로 넘김, 공개는 받아 둔 글에도 보임(가입 직후에 글이 이미 기기에 있을 일은 없지만 닉네임이 있을 때만이라 다시 열면 안 보인다) — 틀리면 비용: 서버에 닉네임 응답을 더하는 서버 작업. 커밋: fa0b767
- 태스크 7 중 화면 비교에서 고침(keep-all): 전 — 약관 글 문단 · 별명 공개의 별명이 낱말 중간에서 줄이 바뀜("제공/하는", "책임/감") — 시안 HTML 은 `word-break: keep-all`(보드 6-2 문단 · 보드 10 별명) → 후 — `Txt` 에 `keepAll`(웹 CSS `word-break: keep-all`, iOS `lineBreakStrategyIOS="hangul-word"`, 안드로이드는 설정이 없어 그대로), 약관 글의 머리말 · 문단 · 목록 · 표 칸과 별명 공개의 별명에 켬. 확인: `components`(Txt keepAll) · `legal-screens` · `reveal-view` 새 기대 먼저 3 실패 → 71 통과, 웹에서 다시 찍어 "책임감" · "독창적인" · "제공하는" 이 한 낱말로 남음(`compare/v2/side/10--10-board.png` · `6-2.png`), `npx jest` 74 묶음 973 통과, `npx tsc --noEmit` · `npx expo lint` exit 0. 커밋: d7786a8
- 태스크 7 중 독립 리뷰(깨끗한 맥락의 리뷰 에이전트, `.claude/agents/reviewer.md` 지침 · diff `8564b0e...HEAD` 와 기준만 줌)의 지적 고침: (1) 웹 구글은 GIS 가 버튼을 그리지 못해도(스크립트 실패 · GIS 없음) 배지만 떴다 → 구글이 버튼을 그린 뒤(`buttonWidth`)에만 배지, (2) 별명 공개는 고정 높이에 긴 별명이 쌓여 작은 화면 · 큰 글자에서 유일한 출구 "풀이 읽기" 가 밀릴 수 있었다(360×640 · 3버튼 내비에서 573 > 568 계산) → 그림 · 글 · 칸만 굴러가고(`reveal-scroll`) 버튼은 아래에 붙음, (5) 동의하기 위 가림막이 다 차는 자리가 시안보다 약 11px 위였다(시안 130 칸의 32% = 41.6, 앱은 아래 34 를 화면 여백으로 두어 96 칸의 32% = 30.7) → 96 칸에서 41.6 이 되게 비율을 옮김. 확인: 새 테스트 4 먼저 실패 → 통과(GIS 실패 · GIS 없음이면 배지 없음, 풀이 읽기는 굴러가는 칸 밖, 가림막 정지점 × 96 ≈ 0.32 × 130), `npx tsc --noEmit && npx expo lint && npm test` 3회 연속 exit 0 · 74 묶음 976 통과. 고치지 않은 지적: (3) 동의하기가 세션 상태를 보지 않음 — 계획에 적은 결정(초안이 메모리라 가입 중이 아니면 쓸 데가 없고, 누르면 뒤로 갈 뿐), (6) feat 커밋 `fc1a3b2` 에 DESIGN.md 아이콘 줄이 섞임 — 이미 커밋된 기록이라 고쳐 쓰지 않고 PR 설명에 적는다, (7) 결정 044 에 결정 넷 — 계획 태스크 1 이 한 문서로 시킴, (8) 처리방침 글의 동의하기가 "[필수] 개인정보 수집 · 이용" 을 켜는 것의 법적 해석 — 소유자 · 법무 확인 필요. (4) DESIGN.md 의 그라데이션 금지와의 충돌은 다음 docs 커밋. 커밋: 8f7dabd
- 리뷰 (4) 문서: DESIGN.md "쓰지 않는 것" 의 "브랜드 자리 밖의 그라데이션" 줄에 예외 — 굴러가는 칸 끝에서 바탕색과 같은 색으로 사라지는 가림막(태어난 곳 시트 목록 아래 · 약관 글의 동의하기 위, 결정 042 · 044). 시안 6-2 와 기존 `place-sheet.tsx` 가 이미 쓰던 것을 규칙에 적음. 커밋: (다음 커밋에 적는다)

---
type: plan
status: done
tags: [마이, 설정, 화면 구조, 정보 구조]
last_reviewed: 2026-11-18
---
# 마이에 설정을 합친다 — 설정 화면 한 단계를 없앤다

> 상태: 완료(2026-11-18) · 승인 2026-11-18 소유자 "승인" · 기준 2026-11-18 · 브랜치 `feat/my-flatten-settings`(`feat/brand-dark-design-system` 위에 쌓음, PR #22 다음)

## 목표
- 무엇을: 마이(`/my`)에 지금 설정 화면(`/settings`)의 줄을 바로 펼치고, 설정 화면 한 단계를 없앤다.
- 누구를 위해: 문의 · 자주 묻는 질문 · 계정 삭제를 찾는 사용자. 지금은 마이 → 설정 → 항목으로 두 번 눌러야 한다.
- 끝나면: 마이 한 화면에 출생 정보와 도움 · 약관 · 앱 버전 · 계정 삭제가 다 보인다. 출생 정보가 없어도 이 줄들은 보인다.

## 결정된 전제
- 소유자: "마이페이지 구성도 수정하자. 굳이 설정 따로 만들어서 뎁스를 만들어야 할까" (2026-11-18)
- 아래 탭 홈 · 마이(결정 019), 설정의 줄 순서는 도움을 찾는 줄이 먼저(결정 024), 계정 삭제 시트(F9).
- 디자인: DESIGN.md(결정 033). 부품은 `ListRow` · `SectionLabel` · `TextLink` 를 그대로 쓴다.

## 내 결정 (묻지 않고 고른 기본값)
- 마이의 순서: 출생 정보 카드 → "도움"(자주 묻는 질문 · 문의하기) → "약관 · 정보"(개인정보 처리방침 · 이용약관 · 앱 버전) → 계정 삭제(빨강 줄, 맨 아래 따로). 묶음 제목은 `SectionLabel`.
- 출생 정보가 없을 때: 지금은 마이 전체가 "출생 정보를 먼저 넣어 주세요" 로 바뀌어 문의 · 계정 삭제에 갈 수 없다. 카드 자리에 그 안내와 "출생 정보 넣기" 를 두고 아래 줄들은 그대로 보인다.
- 하위 화면 주소(`/settings/faq` · `/settings/inquiry` · `/settings/privacy` · `/settings/terms`)는 그대로 둔다. 주소를 옮기면 바뀌는 파일만 늘고 사용자에게 보이는 차이가 없다. `/settings` 자체(목록 화면)만 지운다. 출시 전이라 밖에서 걸린 `/settings` 링크는 없다.
- 문의를 보낸 뒤 "설정으로 돌아가기" → "마이로 돌아가기", 돌아갈 곳이 없을 때 `/settings` → `/my`.
- 계정 삭제 뒤에는 지금처럼 쌓인 화면을 걷고 `/` 로 간다.

## 범위 밖
- 로그아웃 · 알림 설정(소셜 로그인 · 푸시 때). 마이에 다른 기능(지난 궁합 · 공유 목록) 더하기. 브랜드 그림 넣기(별도 작업).

## 전역 제약
- 색 · 글자 · 간격은 theme.ts, 문구는 strings.ts 에서만. 한 태스크 = 한 커밋, 문서와 코드 분리.
- 테스트를 먼저 바꿔 실패를 본 뒤 고친다.

## 태스크

### 1. adr-my-settings  · 상태: 완료
- 읽을 것: `docs/decisions/019-home-categories.md`, `024-faq-and-inquiry-form.md`, `docs/release-1.0.0.md` "화면" 표의 마이 · 설정 줄과 F9
- 할 것: `docs/decisions/034-settings-into-my.md`(마이에 설정을 합친다, 위 "내 결정"). 019 · 024 머리 `superseded_by` 에 대체 표시만. release-1.0.0.md 화면 표의 마이 줄을 고치고 설정 줄을 지운다. F9 · F7 의 "설정에서" 는 "마이에서" 로.
- 검증: `grep -n "/settings\`" docs/release-1.0.0.md` → 하위 화면 줄만 남음
- 결과 요약: ADR 034, 019 · 024 대체 표시, release-1.0.0.md 의 F1 · F7 · F8 · F9 와 화면 표.

### 2. my-with-settings  · 상태: 완료
- 읽을 것: `src/app/my.tsx`, `src/app/settings/index.tsx`, `src/app/settings/inquiry.tsx`(27줄), `src/__tests__/settings-screen.test.tsx`, `src/__tests__/inquiry-screen.test.tsx`(158줄), `src/content/strings.ts` 의 `my` · `settings` · `inquiry.done`
- 할 것:
  - 테스트 먼저: `settings-screen.test.tsx` 의 목록 · 계정 삭제 테스트를 마이 화면 대상으로 옮긴다(`my-screen.test.tsx`). 출생 정보가 없을 때도 줄들이 보이는지, 계정 삭제 시트가 열리는지, 각 줄이 하위 주소로 가는지. 문의 화면의 돌아갈 곳 기대를 `/my` 로. → 실패 확인
  - `my.tsx`: 설정 줄 대신 묶음 두 개 + 계정 삭제 줄 + `AccountDeleteSheet`. 출생 정보 없을 때는 카드 자리만 안내로.
  - `src/app/settings/index.tsx` 를 지운다. `inquiry.tsx` 의 돌아갈 곳을 `/my` 로.
  - strings: `my.settings` 지우고 묶음 제목 둘(`my.help` · `my.info`) 더하기, `inquiry.done.back` 을 "마이로 돌아가기". `settings.title` 은 쓰는 곳이 없어지면 지운다.
- 하지 말 것: 하위 화면 주소 옮기기, 계정 삭제 동작 바꾸기. 이유: 위 "내 결정".
- 검증: `npm test` 실패 0 · `npx tsc --noEmit && npx expo lint` exit 0 · `grep -rn "'/settings'" src` → 0줄
- 결과 요약: `my.tsx` 에 도움 · 약관 · 정보 · 계정 삭제, 출생 정보 없을 때도 줄 · 탭, `settings/index.tsx` 삭제, 문의 뒤 돌아갈 곳 `/my`, 테스트 이동(`my-screen.test.tsx`).

### 3. verify  · 상태: 완료
- 할 것: `/verify` 표, 웹 390 폭 스크린샷(출생 정보 있을 때 · 없을 때 · 계정 삭제 시트) `docs/design/progress/2026-11-18-my-*.png`, 리뷰어(깨끗한 컨텍스트).
- 결과 요약: verify 1 · 2 · 3 통과, 스크린샷 3장 콘솔 에러 0, 리뷰 지적 수정 5건 반영.

## 검증
- tsc · lint exit 0, `npm test` 실패 0, `npx expo export --platform web` exit 0, 스크린샷 3장 콘솔 에러 0.

## 리뷰 초점
1. 계정 삭제 뒤 뒤로 가기로 마이(지워진 계정의 화면)에 돌아갈 수 없는지 → 태스크 2 테스트(`dismissAll` · `replace('/')`).
2. 출생 정보가 없을 때 아래 탭(`MainTabs`)이 보이는지 — 지금은 숨는다. 홈으로 돌아갈 길이 있어야 한다 → 태스크 2 테스트.
3. FAQ 에서 "문의하기" 로 가는 길(`/settings/inquiry`)이 그대로인지 → `faq-screen.test.tsx` 124줄.
4. 웹에서 주소창에 `/settings` 를 치면 무엇이 보이는지(없는 화면) → 태스크 3 에서 한 번 열어 본다.
5. 줄이 늘어 마이가 휴대폰 한 화면을 넘을 때 아래 탭과 겹치지 않는지 → 태스크 3 스크린샷.

## 자동 반복
- 하지 않는다.

## 위험 · 되돌리기
- 작업 브랜치, 태스크마다 한 커밋. PR #22 가 바뀌면 이 브랜치를 그 위로 다시 올린다.

## 실행 기록

### 태스크 2
```
$ npx jest src/__tests__/my-screen.test.tsx src/__tests__/inquiry-screen.test.tsx   (고치기 전)
Tests:       12 failed, 21 passed, 33 total
$ npx jest   (고친 뒤)
Test Suites: 48 passed, 48 total
Tests:       715 passed, 715 total
$ npx tsc --noEmit
tsc exit 0
```
- 결정: `restore-birth.test.tsx` 의 계정 삭제 흐름도 지운 설정 화면 대신 마이를 그린다.
- 결정: 앞 브랜치(PR #22)의 테스트가 내던 린트 경고 두 개(`require`)를 그 브랜치에서 `jest.requireActual` 로 고치고 이 브랜치를 다시 올렸다 — 값을 흰색으로 되돌리면 실패하는 것을 확인했다.

### 태스크 3
```
$ npx tsc --noEmit && npx expo lint    → exit 0
$ npm test                             → Test Suites: 48 passed · Tests: 715 passed
$ npx expo export --platform web       → Exported: dist (exit 0)
$ node my-shots.mjs (웹 390)           → console errors: 0
```
- 웹에서 `/settings` 를 열면 Expo 기본 "Unmatched Route" 가 나온다. 없는 주소는 어디나 같다(앱에 `+not-found` 가 없다 — 원래 있던 문제, 따로).

reviewer(깨끗한 컨텍스트) 지적과 처리
| # | 심각도 | 지적 | 처리 |
|---|---|---|---|
| 1 | 수정 | architecture.md 36 · 75 줄이 지운 설정 화면을 가리킴 | 고침 |
| 2 | 제안 | 문의 뒤 "마이로 돌아가기" 가 실제로는 온 곳(FAQ)으로 감 | 버튼을 "돌아가기" 로(테스트 red → green) |
| 3 | 제안 | 탭으로 열린 마이(걷어 낼 화면 없음)에서의 삭제 경우를 테스트가 안 침 | 테스트 더함, 주석 고침 |
| 4 | 제안 | 기획안 화면 표에 설정 화면 | 머리에 바뀐 결정(032 · 033 · 034 · 035) 한 줄 |
| 5 | 제안 | `+not-found` 없음, `_sitemap` 이 운영에서도 열릴 수 있음 | 원래 있던 문제 — 소유자에게 따로 알림 |
| 6 | 제안 | 불러오는 동안 아래 탭이 늦게 나타남 | 불러오는 동안에도 탭(테스트 red → green) |
| 7 | 제안 | 계획 기록 · 스크린샷 미커밋, 넓은 화면 스크린샷 없음 | 기록 · 스크린샷 커밋. 넓은 화면은 마이 구조가 폭과 무관해 생략 |
```
$ npx jest   (리뷰 반영 뒤)
Test Suites: 48 passed, 48 total
Tests:       718 passed, 718 total
$ npx tsc --noEmit && npx expo lint
exit 0
```

## 실제 결과
- 무엇이 달라졌나: 설정 화면이 없어지고 마이 한 화면에 출생 정보 · 도움 · 약관 · 정보 · 계정 삭제가 보인다. 출생 정보가 없어도 줄과 아래 탭이 보인다.
- 검증 출력: tsc · lint exit 0, 테스트 718/718, 웹 빌드 exit 0, 스크린샷 콘솔 에러 0.
- 남은 것: 없는 주소용 한국어 화면(`+not-found`)과 `_sitemap` 끄기(원래 있던 문제).

## 내가 내린 결정
- 마이 묶음 순서와 제목("도움" · "약관 · 정보") — 결정 024 의 순서 유지 — 문구만 바꾸면 된다.
- 하위 화면 주소 유지 — 사용자에게 차이가 없다 — 옮기려면 파일 4개와 테스트.
- 출생 정보가 없어도 줄 · 탭 보이기 — 문의 · 삭제로 갈 길이 없었다 — 비용 없음.
- 문의 뒤 버튼 "돌아가기" — 온 곳으로 돌아간다 — 문구 하나.

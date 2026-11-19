---
type: plan
status: approved
tags: [온보딩, 로그인, 가입, 디자인 시안]
last_reviewed: 2026-11-19
---
# 온보딩 시안 구현 — 스플래시 · 소개 · 로그인 · 약관 · 닉네임 · 출생 정보 · 별명 짓는 중

> 상태: 승인(소유자 2026-11-19 "바로 시작해") · 기준 2026-11-19 develop `03a8bb3` + `origin/feat/social-email-nickname`(결정 039 · 이메일 범위 요청)을 합친 위 · 브랜치 `feat/onboarding-design` · 시안 원본: 캔버스 https://claude.ai/artifact/Rt33TzPSEe4PdxNRCej3xT · 피그마 https://www.figma.com/design/PNrWFsXHhF8crQkLA3SYBn ("별명 온보딩 시안", 보드 20개)

## 목표
- 무엇을: 소유자가 고른 온보딩 시안을 앱(iOS · Android · 웹)에 그대로 옮긴다. 흐름은 스플래시 → 소개 3장 → 로그인 → 약관 동의 → 닉네임 → 출생 정보 → 별명 짓는 중이다.
- 누구를 위해: 처음 설치한 사람이 점성술을 몰라도 3분 안에 첫 별명까지 가게 한다.
- 끝나면: 새 사람은 약관 동의(필수 2 · 선택 2)와 닉네임, 출생 정보를 단계마다 하나씩 넣고 가입한다. 로그인 버튼은 공급자 가이드를 따른다. 화면은 피그마 보드와 같다.

## 결정된 전제
- 결정 033(어두운 디자인 시스템) · 034(소셜 로그인 공급자별 방식) · 035(브랜드 그림 · 별이) · 038(설정을 마이로).
- 결정 039(다른 세션, `feat/social-email-nickname`): 이메일은 공급자에서 필수, 닉네임과 마케팅 동의는 가입에서 받는다. **이 계획은 039 의 "가입 화면은 한 화면" 만 단계식으로 바꾼다** → 태스크 1 의 새 결정.
- 서버: PR #19(이메일 필수, 결정 024 — 400 `EMAIL_REQUIRED`), 서버 세션의 `feat/account-nickname-consent`(결정 025, `POST /auth/signup` 의 `nickname` · `marketingConsent`, `GET/PATCH /account`), 서버 계획 `docs/plans/2026-11-19-signup-terms-push-consent.md`(약관 버전 · 푸시 동의 — 서버 저장소의 `docs/signup-terms-push-consent` 브랜치).

## 인터뷰 결과 (소유자 2026-11-19, 시안을 고치며 정한 것)
| 정한 것 | 영향 |
|---|---|
| 스플래시에는 로고만, 아래 문구 없음 | 태스크 4 |
| 로그인 버튼: 카카오 · 애플 · 구글 각 공식 가이드. 로고는 왼쪽 16px 같은 세로줄, 문구는 버튼 가운데, 높이 48 · 반경 12, **글자는 셋 다 16px**(애플의 "제목 = 높이의 43%" 만 벗어남 — 소유자가 통일을 골랐다). 안드로이드는 애플 없음. 구글 문구는 "Google로 계속하기"(소유자 2026-11-19 — 보드와 다름(소유자 결정)) | 태스크 3 · 5 |
| 로그인 화면 아래 안내 문구(만 14세 · 약관) 없음, 이메일 동의 안내 띠 없음 | 태스크 5 |
| 약관 단계를 닉네임보다 먼저: 모두 동의 + [필수] 이용약관 · [필수] 개인정보 수집 · 이용 · [선택] 푸시 알림 받기 · [선택] 마케팅 정보 수신(앱 푸시 · 이메일). 필수와 선택 사이 구분선 없음. 야간(21~08시) 광고는 보내지 않으므로 야간 동의는 받지 않는다 | 태스크 6 |
| 닉네임은 따로 한 단계 | 태스크 7 |
| 출생 정보: 위 안내 문구 없음. 시각 "모름" 은 칸 이름 줄 오른쪽의 작은 체크. 시각은 바텀시트(오전/오후 · 시 · 분 휠, 제목 가운데). 시각을 몰라도 태어난 곳은 받는다 | 태스크 8 |
| 태어난 곳은 바텀시트: 맨 위 "동네 이름으로 찾기" 검색, 아래 시 · 도 칩 → 시 · 군 · 구 목록(추천안, 보드 8-2 · 8-2-1 · 8-2-2) | 태스크 8 |
| 별명 짓는 중: 애니메이션(별이 둥실 · 뒤 빛 · 궤도 점 · 안내 문구 세 줄 순환), "길면 1분쯤 걸려요" 없음 | 태스크 9 |

## 소유자가 정한 것 (2026-11-19, 계획을 쓴 뒤)
1. **닉네임**: 한글 · 영문만 2~10자(숫자 · 공백 · 기호 안 됨, 한글과 영문은 섞어도 된다 — 내 해석), **중복 안 됨**(영문은 대소문자를 같게 본다 — 내 결정). 서버 결정 025 의 "1~20자 · 중복 허용" 을 바꾼다 → 서버 세션에 요청.
2. **프로필**: 브랜드 그림으로 만든 8종(별이 · 웃는 별이 · 윙크 별이 · 조는 별이 · 달 · 하트 · 불꽃 · 구슬) 가운데 하나를 닉네임 단계에서 고른다. 화면에는 "프로필 그림" 이 아니라 "프로필" 이라고 쓴다. 시안 보드 7(위 가운데 88px + 연필 표시) · 7-4(고르기 시트 — 제목 · 이름 없이 그림 4열 2줄 + 확인). 그림 원본은 `assets/brand/avatar-*.svg` 로 둔다.
3. **이미 있는 닉네임 문구**: "이미 있는 닉네임이에요."(시안 7-3). 오류 문구는 모두 한 줄로 짧게.
4. **앱 세션 계획과의 관계**: 앱 세션 계획 `2026-11-19-social-email-nickname.md` 의 태스크 5(가입 한 화면)는 이 계획의 태스크 6~8 로 대체하고, 태스크 4(`app-api-account`)는 그대로 쓴다.

## 내 결정 (묻지 않고 고른 기본값)
- 소개 3장은 **처음 실행 때만** 보인다. 본 표시는 기기 저장소(`expo-secure-store` 가 아니라 일반 저장소 — 개인정보 아님)에 둔다. "건너뛰기" 도 본 것으로 친다.
- 웹의 구글 버튼은 구글이 그리는 공식 버튼(GIS)을 그대로 쓴다. GIS 는 글자 크기와 높이(최대 40)를 바꿀 수 없어서 웹에서만 구글 버튼이 조금 작다. 앱(iOS · Android)은 가이드 값으로 직접 그린다.
- iOS 애플 버튼은 시스템 버튼 대신 직접 그린다(16px 통일 때문). 누르면 `expo-apple-authentication` 의 `signInAsync` 를 부른다. 웹은 Apple JS 버튼 모양을 같은 규칙으로 직접 그린다.
- `EMAIL_REQUIRED`(드묾 — 카카오는 이메일 필수 동의, 애플 · 구글은 늘 준다)는 안내 띠 대신 시스템 알림 창 한 번으로 알린다.
- 푸시: 이번엔 **동의 여부만** 서버에 보낸다. 운영체제 알림 권한 창과 기기 토큰 등록은 푸시 기능 계획에서 한다(`expo-notifications` 는 네이티브 모듈이라 개발 빌드가 다시 필요하다).
- 동의 · 닉네임 · 출생 정보는 마지막 "내 별명 읽기" 에서 `POST /auth/signup` 한 번으로 보낸다. 그 전 단계 값은 메모리(가입 상태)에만 둔다 — 기기 저장소에 두지 않는다.
- 별명 짓는 중의 움직임은 `react-native-reanimated`(이미 있음). 기기의 "동작 줄이기" 가 켜져 있으면 멈춘 첫 장면만 보인다.

## 범위 밖
- 서버 변경(서버 계획 두 개가 맡는다). 메일 발송 · 2년 수신 동의 확인. 운영체제 푸시 권한 · 토큰. 약관 개정 때 다시 동의받기. 마이의 닉네임 · 동의 바꾸기(앱 세션 계획 태스크 6).
- 피그마 컴포넌트 정리 · 피그마 모션.

## 전역 제약
- Expo SDK 58 · Expo Router · React Native 0.88. 패키지는 `npx expo install` 만. 새 네이티브 모듈은 넣지 않는다(이 계획은 개발 빌드를 다시 만들지 않는다).
- 색 · 글자 · 간격은 `src/constants/theme.ts`, 문구는 `src/content/strings.ts` 에서만(골든 룰). 시안 색은 이미 theme 토큰과 같다(paper `#0D0E12` · raised `#16171D` · fill `#1C1D24` · hair `#2A2B33` · primary `#4752FF` · danger `#E5484D` …).
- 로그인 · 만 14세 · 닉네임 판정은 서버 응답을 따른다. 앱은 같은 규칙으로 먼저 안내만 한다.
- 출생 정보 · 닉네임 · 이메일은 로그 · 분석 이벤트 · 기기 저장소에 두지 않는다.
- 공급자 버튼 값(바꾸지 않는다): 카카오 바탕 `#FEE500` · 심볼 `#000000` · 글자 `#000000` 85% · 문구 "카카오 로그인" · 심볼은 카카오 공식 리소스. 구글 다크 바탕 `#131314` · 테두리 `#8E918F` 1px · 글자 `#E3E3E3` · 문구 "Google로 계속하기"(소유자 2026-11-19 'Google로 계속하기' — 보드 5 · 5-1 의 "Google 계정으로 계속하기" 와 다름(소유자 결정). 웹은 GIS 가 그리는 글자 `continue_with` · `ko`) · G 로고 원래 색. 애플 흰 바탕 · 검정 로고와 글자 · 문구 "Apple로 계속하기".

## 태스크

### 1. adr-stepped-signup · 상태: 완료
- 읽을 것: `docs/decisions/039-*`(다른 세션 브랜치 `origin/feat/social-email-nickname`), 034, 033, 이 계획의 "인터뷰 결과"
- 할 것: `docs/decisions/<다음 번호>-stepped-onboarding.md`. 번호는 모든 원격 브랜치를 훑어 비어 있는 것(지금 039 사용, 040 은 다른 세션이 쓸 예정 → 041 부터 확인). 내용: 단계식 흐름, 약관 항목, 로그인 버튼 규칙(애플 16px 예외 포함), 소개는 처음 한 번. 039 앞머리에 "가입 한 화면은 <번호> 가 대체" 한 줄.
- 주는 것: 결정 번호(뒤 태스크 주석의 근거)
- 하지 말 것: 039 본문을 고쳐 쓰지 않는다. 이유: 결정은 대체 표시만 한다(골든 룰).
- 검증: `ls docs/decisions | sort | uniq -d` → 비어 있음, 새 파일의 번호가 원격 어느 브랜치에도 없음

### 2. strings-onboarding · 상태: 완료
- 읽을 것: `src/content/strings.ts`, 피그마 보드 문구
- 할 것: `strings.intro`(세 장의 제목 · 본문 · 건너뛰기 · 다음 · 시작하기), `strings.terms`(제목 · 안내 · 모두 동의 · 항목 넷 · 마케팅 설명 · 보기), `strings.nickname`(제목 · 안내 "프로필과 닉네임은 나중에 마이에서 바꿀 수 있어요." · 자리 글자 · 규칙 안내 "한글 · 영문으로 2~10자" · 오류 "한글 · 영문만 쓸 수 있어요." · "이미 있는 닉네임이에요." · 프로필 8종의 접근성 이름(화면에는 안 보임)), `strings.birthSheet`(곳 검색 자리 글자 "동네 이름으로 찾기" — 예시 없이 · 시 · 도), `strings.making`(제목 · 순환 문구 셋). `login.kakao` → "카카오 로그인", `login.google` → "Google로 계속하기"(소유자 2026-11-19 'Google로 계속하기' — 보드와 다름(소유자 결정)). `login.subtitle` · `ageNotice` · `signupGuide` 는 쓰는 곳이 없어지면 지운다.
- 주는 것: 위 키 이름
- 하지 말 것: 화면 파일에 문구를 직접 쓰지 않는다. 이유: 문구는 한 곳에서만 바뀐다.
- 검증: `npx tsc --noEmit` 통과, `grep -rn "카카오로 계속하기\|구글로 계속하기" src` → 0건

### 3. social-buttons · 상태: 완료
- 읽을 것: `src/features/auth/providers/*`(google · apple · kakao 의 .web · .ios · 기본), 이 계획 "전역 제약" 의 공급자 값, 시안 보드 5 · 5-1
- 할 것: `src/features/auth/providers/social-button.tsx` — `SocialButton({ provider: 'KAKAO' | 'APPLE' | 'GOOGLE', label: string, onPress, disabled })`: 높이 48 · 반경 12 · 로고 칸 20×20 을 왼쪽 16 에 고정 · 문구는 버튼 전체 폭 가운데 · 16px · 굵기 500. 로고는 SVG(카카오는 공식 리소스의 심볼, 애플 · 구글 로고). 공급자 파일들이 이 부품을 쓴다. iOS 애플은 시스템 버튼 대신 이 부품 + `signInAsync`. 웹 구글은 GIS 버튼 그대로(내 결정).
- 주는 것: `SocialButton`
- 하지 말 것: 공급자 색 · 문구 · 로고 비율을 바꾸지 않는다. 이유: 각 가이드 위반(애플 글자 크기만 소유자 예외).
- 검증: 버튼 렌더 테스트(공급자별 바탕색 · 문구 · 로고 위치 left 16)를 먼저 쓰고 실패를 본 뒤 통과. `npm test -- social-button`

### 4. splash-intro · 상태: 대기
- 읽을 것: `app.json`(expo-splash-screen), `assets/brand/splash.svg`, `scripts/render-brand.mjs`(SVG → `assets/images/` PNG, 결정 035), `src/app/_layout.tsx`(가드 · 덮개), `src/features/auth/guard.ts`, 시안 보드 1~4
- 할 것: 스플래시는 `render-brand.mjs` 가 `splash.svg` 로 만든 PNG 를 쓰는지 확인하고, 아니면 그것으로 바꾼다(아래 문구 없음 — `node scripts/render-brand.mjs`). `src/app/intro.tsx` 소개 3장(가로 넘김, 점 표시, 건너뛰기 · 다음 · 시작하기). `src/features/onboarding/intro-seen.ts` — `hasSeenIntro(): Promise<boolean>`, `markIntroSeen(): Promise<void>`. 가드: 로그인 전 + 소개 안 봄 → `/intro`, 본 뒤 → `/login`. 소개의 그림은 별이 · 하트 카드 · 달 카드 · 타임라인(시안 그대로, `Byeoli` · `glow.tsx` 재사용).
- 주는 것: `/intro` 경로, `hasSeenIntro` · `markIntroSeen`
- 하지 말 것: 소개를 로그인한 사람에게 보이지 않는다. 이유: 처음 한 번만(내 결정).
- 검증: 가드 테스트 — 로그인 전 · 안 봄 → `/intro`, 로그인 전 · 봄 → `/login`, 로그인 → 소개 안 감. `npm test -- guard intro`

### 5. login-screen · 상태: 대기
- 읽을 것: `src/app/login.tsx`(REASONS), 태스크 3 의 `SocialButton`, 시안 보드 5 · 5-1
- 할 것: 위는 로고(`splash.svg` 그림) + "별이 붙여 준 나의 별명", 아래는 버튼 셋(Android 는 둘) — 간격 12, 바닥 여백 48. 아래 안내 문구 없음. `UNDER_AGE` · `SIGNUP_EXPIRED` 는 지금처럼 안내하고, `EMAIL_REQUIRED` 는 시스템 알림 창(내 결정).
- 주는 것: 없음
- 하지 말 것: 로그인 여부를 앱 값으로 판정하지 않는다. 이유: 골든 룰.
- 검증: `npm test -- login` — 버튼 순서(카카오 · 애플 · 구글, Android 는 애플 없음), `EMAIL_REQUIRED` 면 알림 창

### 6. terms-step · 상태: 대기
- 읽을 것: `src/features/auth/session-store.ts`(`signingUp`), `src/components/checkbox.tsx`, `src/app/settings/terms.tsx` · `privacy.tsx`(본문 보기), 서버 계획의 `termsVersion` · `privacyVersion` · `pushConsent`, 시안 보드 6 · 6-1
- 할 것: `src/app/signup/terms.tsx`. 모두 동의 줄 + 항목 넷(필수는 보라 `[필수]`, 선택은 회색 `[선택]`, "보기" 는 약관 · 처리방침 화면으로). 필수 둘이 다 켜져야 "다음". 가입 상태에 `src/features/auth/signup-draft.ts` — `type SignupDraft = { termsVersion: string; privacyVersion: string; pushConsent: boolean; marketingConsent: boolean; nickname?: string }`, `setDraft(patch)`, `getDraft()`, `clearDraft()`(메모리만). 약관 버전 문자열은 `strings` 가 아니라 `src/content/legal-versions.ts` 한 곳.
- 주는 것: `SignupDraft` · `setDraft` · `getDraft` · `clearDraft`, `/signup/terms`
- 하지 말 것: 선택 항목을 기본으로 켜지 않는다. 이유: 선택 동의는 사용자가 직접 켜야 한다(정보통신망법 50조). "모두 동의" 만 넷을 한 번에 켠다.
- 검증: `npm test -- terms` — 필수 하나라도 꺼지면 "다음" 꺼짐, 모두 동의는 넷 다, 선택 기본 꺼짐, 초안에 버전 · 동의가 들어감

### 7. nickname-step · 상태: 대기
- 읽을 것: 태스크 6 의 `SignupDraft`, "소유자가 정한 것" 1~3, 서버 계약(서버 저장소 `docs/architecture.md` 의 닉네임 확인 경로), 시안 보드 7 · 7-1 · 7-2 · 7-3 · 7-4
- 할 것: `src/app/signup/nickname.tsx`. 위 가운데 고른 프로필(88px, 누르면 고르기 시트 — 제목 · 이름 없이 그림만) + 닉네임 칸 + 글자 수(`n/10`) + 규칙 안내. 규칙에 어긋나면 칸 테두리 빨강 + 안내, "다음" 꺼짐. "다음" 을 누르면 서버에 닉네임 확인 → 이미 있으면 "이미 있는 닉네임이에요." 키보드가 올라오면 "다음" 이 키보드 바로 위로. 처음 들어오면 그림 하나를 무작위로 골라 둔다. `src/features/auth/nickname-rule.ts` — `checkNickname(raw: string): { ok: true; value: string } | { ok: false; reason: 'TOO_SHORT' | 'TOO_LONG' | 'INVALID_CHAR' }`(한글 완성형 가~힣 · 영문 a~z A~Z 만, 2~10자). `src/components/avatar.tsx` — `Avatar({ id: AvatarId, size })`, `type AvatarId = 1 | 2 | … | 8`, `src/features/auth/avatar-sheet.tsx`. 초안에 `avatar: AvatarId` 를 더한다.
- 주는 것: `checkNickname`, `Avatar` · `AvatarId`, `/signup/nickname`
- 하지 말 것: 입력할 때마다 서버에 묻지 않는다. 이유: 요청이 늘고 남의 닉네임을 하나씩 떠보기 쉬워진다("다음" 에서 한 번).
- 검증: `npm test -- nickname avatar` — 1자 · 11자 · 숫자 · 공백 · 기호 거절, 한글+영문 섞기 통과, 이미 있으면 안내하고 다음 단계로 안 감, 그림을 바꾸면 초안의 avatar 가 바뀜

### 8. birth-step · 상태: 대기
- 읽을 것: `src/app/signup.tsx`, `src/features/chart/birth-form.tsx` · `birth-fields.tsx` · `place-picker.tsx`, `src/components/sheet.tsx` · `scroll-picker.tsx`, 시안 보드 8 · 8-1 · 8-2 · 8-2-1 · 8-2-2 · 8-3 · 8-4
- 할 것: `src/app/signup.tsx` → `src/app/signup/birth.tsx`(진행 막대 3/3, 위 안내 문구 없음). 시각 칸 이름 줄 오른쪽에 "모름" 체크(켜면 시각 칸 흐림 + "태어난 시각을 몰라 하우스와 상승점은 보여 드리지 않아요."). 시각 시트 제목 가운데, 휠 세 칸 같은 폭. 태어난 곳은 `PlacePicker`(전체 화면) 대신 `src/features/chart/place-sheet.tsx` — 검색 칸(서버가 준 지역 목록을 앱이 거른다, 같은 이름이면 시 · 도를 앞에, 결과 개수 줄은 두지 않는다) · 시 · 도 칩 17개(3열) · 시 · 군 · 구 목록(뒤로 가기, 고른 곳에 체크). 홈의 출생 정보 바꾸기(`/birth`)도 같은 칸을 쓴다.
- 주는 것: `PlaceSheet`, `/signup/birth`
- 하지 말 것: 지역 목록을 앱에 새로 넣지 않는다. 이유: 서버가 준 목록이 원본이다(결정 006 정신).
- 검증: `npm test -- birth place` — "모름" 켜면 시각 값 없이 보냄, 검색 "중구" → 6곳, 시 · 도 → 시 · 군 · 구 → 고르면 칸에 "서울 강남구"

### 9. making-screen · 상태: 대기
- 읽을 것: `src/app/reading.tsx`(지금의 "별명을 짓는 중"), `src/components/byeoli.tsx` · `glow.tsx`, 시안 보드 9(캔버스에서 움직임 확인)
- 할 것: `src/features/reading/making-view.tsx` — 별이 둥실(위아래 8 · 3.2초), 뒤 빛(투명도 0.55↔1 · 크기 1↔1.08), 궤도 둘(9초 · 15초 반대 방향), 작은 별 반짝임, 안내 문구 셋 2.5초마다 바뀜(`strings.making`). `useReducedMotion()` 이 참이면 멈춘 첫 장면.
- 주는 것: `MakingView`
- 하지 말 것: "길면 1분쯤 걸려요" 를 넣지 않는다. 이유: 소유자가 뺐다.
- 검증: `npm test -- making` — 동작 줄이기면 첫 문구만, 아니면 문구 셋이 순서대로

### 10. signup-submit · 상태: 대기
- 읽을 것: 태스크 6 · 7 · 8 의 결과, `src/lib/api.ts`(`signup`), `src/features/auth/use-session.ts`(`completeSignup`), 서버 계약 표(서버 저장소 `docs/architecture.md` 의 `POST /auth/signup`)
- 할 것: "내 별명 읽기" → `completeSignup({ birth, nickname, avatar, termsVersion, privacyVersion, pushConsent, marketingConsent })` → `api.signup` 한 번. 성공하면 초안을 지우고 별명 짓는 중(태스크 9)으로. `INVALID_NICKNAME` · `NICKNAME_TAKEN`(그사이 누가 먼저 가져감) → 닉네임 단계로 돌아가 안내, `TERMS_REQUIRED` → 약관 단계로, `UNDER_AGE` → 생년월일 칸 아래 빨강 안내(보드 8-4), `SIGNUP_EXPIRED` → 로그인으로.
- 주는 것: 없음
- 하지 말 것: 단계마다 서버를 부르지 않는다. 이유: 가입권은 한 번 쓰면 끝이고, 중간에 나가면 계정이 반쯤 생긴다.
- 검증: `npm test -- signup` — 보내는 본문에 일곱 값, 오류 코드마다 돌아가는 단계, 성공하면 초안이 비어 있음

### 11. verify-screens · 상태: 대기
- 읽을 것: `.claude/skills/verify/SKILL.md`, 피그마 보드 20개
- 할 것: `/verify`(타입 · 린트 · 테스트 · 빌드) 후 웹(`npx expo start --web`)에서 보드마다 같은 상태를 띄워 390×844 스크린샷을 찍고 피그마 보드와 나란히 비교. 다른 점은 해당 태스크로 돌아가 고친다.
- 주는 것: 비교 스크린샷 묶음(실행 기록에 경로)
- 하지 말 것: "비슷하다" 로 넘기지 않는다. 이유: 시안이 기준이다.
- 검증: `/verify` 표 전부 통과 + 보드 20개 비교에서 남은 차이 0(예외: 웹 구글 버튼 크기 — 내 결정, 앱 구글 버튼 문구 "Google로 계속하기" — 소유자 2026-11-19 보드와 다름(소유자 결정))

## 검증
- `npx tsc --noEmit && npx expo lint && npm test` 통과, `/verify` 표 전부 통과.
- 처음 설치 흐름(웹): 스플래시 → 소개 → 로그인 → 약관 → 닉네임 → 출생 정보 → 별명 짓는 중 → 풀이 글이 끊김 없이 이어진다.

## 리뷰 초점
1. 가입 중 앱을 껐다 켜면 초안이 남지 않는가(메모리만) — 태스크 6 검증에 테스트.
2. 웹에서 뒤로 가기로 약관 단계를 건너뛰고 닉네임에 바로 들어오면 약관 단계로 돌려보내는가 — 태스크 7 검증에 테스트.
3. 동작 줄이기 + 별명 짓는 중이 1분 넘게 걸릴 때 화면이 멈춘 것처럼 보이지 않는가(문구 하나는 보인다) — 태스크 9.
4. 같은 이름의 시 · 군 · 구(중구 · 동구 · 서구 · 남구 · 북구 · 강서구 · 고성군)를 검색했을 때 시 · 도가 함께 보이는가 — 태스크 8.
5. Android 에서 애플 버튼이 빈칸 없이 사라지고 버튼 두 개의 간격이 그대로인가 — 태스크 5.

## 자동 반복
- 태스크 11 의 비교는 차이가 0 이 될 때까지 반복, 상한 3회. 사람 없이 돌리지 않는다(시안 판단이 들어간다).

## 위험 · 되돌리기
- 서버가 닉네임 · 약관 버전을 필수로 받는 배포와 이 앱 배포는 같은 날이어야 한다(옛 가입 화면은 400). 서버 세션의 notify-app 과 맞춘다.
- 애플 버튼 16px 은 심사에서 지적받을 수 있다. 지적받으면 `SocialButton` 의 애플 글자 크기만 43%(48 → 20.5)로 되돌린다.
- 되돌리기: 화면은 새 경로(`/intro` · `/signup/*`)라 브랜치를 버리면 그대로 돌아간다.

## 실행 기록
- 2026-11-19 승인. 브랜치를 `feat/onboarding-design` 으로 바꾸고 develop `03a8bb3` 위로 옮김. 결정 039 와 이메일 범위 요청(그 계획 태스크 3)을 쓰려고 `origin/feat/social-email-nickname` 을 합침(`846bf4e`). 서버 짝: 서버 저장소 `feat/signup-terms-push-avatar`.
- 태스크 1(결정 041): 전 — 039 "가입 한 화면" · 034 "소개 · 약관 화면 없음" · 020 "시각 모름이면 곳 칸 없음" → 후 — `docs/decisions/041-stepped-onboarding.md`(단계식 가입 · 약관 넷 · 닉네임 2~10자 중복 불가 · 프로필 8종 · 로그인 버튼 16px(애플 예외) · 소개 처음 한 번 · 곳 시트 · 별명 짓는 중), 039 · 034 · 020 앞머리 `superseded_by` 한 줄. 확인: `git fetch --all` 뒤 모든 원격 브랜치에 041 0건(040 은 origin/feat/analytics), `ls docs/decisions | sort | uniq -d` 0줄, 번호 앞 세 자리 중복 0줄. 커밋: 890d32e
- 태스크 2(문구): 전 — `login.kakao` "카카오로 계속하기" · `login.google` "구글로 계속하기", 온보딩 문구 없음 → 후 — "카카오 로그인" · "Google 계정으로 계속하기", `strings.intro` · `steps` · `terms` · `nickname`(프로필 8종 화면 읽기 이름 포함) · `birthSheet` · `making`, `login.tagline` · `login.emailRequired`, `home.timeUnknownNote` · `home.errors.underAge`. `login.subtitle` · `ageNotice` · `signupGuide` 는 아직 로그인 · 가입 화면이 써서 태스크 5 · 8 에서 지운다. 확인: `npx tsc --noEmit` exit 0, `grep -rn "카카오로 계속하기\|구글로 계속하기" src` 0건, `npx expo lint` exit 0, `npx jest src/features/auth src/__tests__/login-screen` 10 묶음 53 통과. 커밋: 218cd9a
- 태스크 3(공급자 버튼): 전 — 카카오 · 구글(앱) · 애플(웹)은 회색 보조 버튼(`Button line`), iOS 애플은 시스템 버튼, 웹 구글 GIS 는 흰 테두리(`outline`) 320 폭 → 후 — `src/features/auth/providers/social-button.tsx`(`SocialButton`: 48 · 12 · 로고 20×20 바깥 왼쪽 16 · 문구 가운데 16px 500 · 공급자 색은 `theme.ts` `SocialButtonStyle`), 카카오(앱 · 웹) · 구글(앱) · 애플(iOS · 웹)이 이 부품을 쓴다. iOS 애플은 이 부품 + `signInAsync`. 웹 구글 GIS 는 그대로 쓰되 `filled_black` · 로고 왼쪽 · 칸 폭(200~400)으로. 확인: `npx jest social-button` 먼저 실패(모듈 없음) → 5 통과, `native-providers` 애플 테스트를 공급자 버튼 기대로 바꿔 3 실패 → 통과, `npx jest` 57 묶음 799 통과, `npx tsc --noEmit` · `npx expo lint` exit 0. 결정: 버튼 글꼴은 공급자 가이드대로 시스템 글꼴(시안 원본도 -apple-system · Google Sans), 막힌 버튼은 투명도 0.4. 커밋: 977d1ee
- 문구 변경(소유자 2026-11-19, 코디네이터 전달): 전 — `login.google` "Google 계정으로 계속하기"(보드 5 · 5-1) → 후 — "Google로 계속하기"(다른 버튼과 같은 꼴). 웹은 GIS 그대로(`text: 'continue_with'` · `locale: 'ko'` — 이미 그렇다). 전역 제약 · 인터뷰 결과 · 태스크 2 · 태스크 11 예외 목록 · 결정 041 맥락 줄을 함께 고침. 확인: `npx jest social-button native-providers` 통과, `grep -rn "Google 계정으로 계속하기" src` 0건. 커밋: (이 커밋)

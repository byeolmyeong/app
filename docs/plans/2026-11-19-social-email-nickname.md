---
type: plan
status: approved
tags: [소셜 로그인, 이메일, 닉네임, 마케팅 수신 동의]
last_reviewed: 2026-11-19
---
# 소셜 로그인에서 이메일(필수)을 받고, 가입 때 닉네임과 마케팅 수신 동의를 받는다

> 상태: 승인(2026-11-19 소유자 "승인") · 기준 2026-11-19 · 앱 · 서버 · 랜딩 · 공급자 콘솔에 걸친다(앱 저장소가 계획의 원본)

## 목표
- 무엇을: 소셜 로그인(카카오 · 애플 · 구글)에서 **이메일만, 필수로** 받는다. 가입(온보딩) 화면에서 **닉네임 · 생년월일 · 태어난 시각 · 태어난 곳**을 받고, **마케팅 메일 수신 동의(선택)**를 따로 받는다.
- 누구를 위해: 운영자(서비스 안내 · 소식 메일을 보낼 주소)와 사용자(카드 · 화면에 쓰일 내 이름).
- 끝나면: 새 계정마다 이메일(공급자가 확인한 값) · 닉네임이 서버에 있고, 마케팅 동의 여부와 동의 일시가 기록된다. 처리방침이 실제 수집 항목과 맞는다.

## 결정된 전제 (링크만)
- 서버 결정 021(`../byeolmyeong-api/docs/decisions/021-social-login-signup-cookie.md`) — 가입권 2단계 · 서버가 ID 토큰 직접 확인. **"계정에는 공급자와 `sub` 만 둔다. 이메일 · 이름은 받지 않는다(V2)" 줄을 이 계획이 대체한다.**
- 앱 결정 034(`docs/decisions/034-social-login-platforms.md`) — 공급자별 방식. 카카오 웹 `scope=openid` 줄을 이 계획이 바꾼다.
- 앱 결정 037(`docs/decisions/037-web-deploy-vercel.md`) — 웹 주소 · 환경 변수.
- 앱 결정 009 · 029 — 가입 마지막 단계에서 출생 정보를 받고 서버에 저장한다(그대로).
- 서버 결정 015 — 감사 기록은 계정과 함께 지워지지 않는다.
- 공개된 처리방침(https://byeolmyeong.com/privacy, 랜딩 `app/data/legal.ts`) 제2조: "이메일 · 이름 · 프로필 정보는 받지 않습니다" — 바꿔야 한다.

## 인터뷰 결과 (2026-11-19 소유자)
| 질문 | 답 | 영향 |
|---|---|---|
| 이메일 용도 | 서비스 안내 + 소식 · 마케팅 | 처리방침에 목적 둘. 마케팅은 정보통신망법 제50조에 따라 **별도 수신 동의(선택)** + 동의 일시 기록 + 처리 결과 알림 + 2년마다 동의 확인 |
| 필수/선택 | 이메일 **필수** | 이메일을 못 받으면 가입하지 못한다(서버가 판정). 카카오 동의항목을 "필수 동의" 로 — 비즈 앱 전환이 필요할 수 있다 |
| 소셜에서 받을 것 | "이메일만" | 이름 · 프로필 사진 · 닉네임은 공급자에게서 받지 않는다 |
| 온보딩에서 받을 것 | 닉네임 · 생년월일 · 태어난 시각 · 태어난 곳 | 지금 가입 화면(`src/app/signup.tsx` = 출생 정보)에 닉네임을 더한다 |
| 카카오가 필수 동의에 비즈 앱 전환을 요구하면 | 전환한다 — 소유자가 2026-11-19 전환 완료 | O1 은 "필수 동의" 로만 한다. 선택 동의 + `EMAIL_REQUIRED` 안내는 카카오에선 안전망으로만 남는다 |
| 첫 소식 · 마케팅 메일 시점 | 출시 뒤 나중에 | 이번 계획은 이메일 · 동의 저장까지. 메일 발송 · 2년 동의 확인(S8)은 첫 마케팅 메일 전 별도 계획 |

## 내 결정 (묻지 않고 고른 기본값)
- **닉네임 규칙**: 앞뒤 공백을 뗀 뒤 1~20자(UTF-16 길이 — 공유 카드 "내 이름"(`share-entry.tsx` `MY_NAME_MAX = 20`)과 같은 한도), 줄바꿈 · 제어 문자 금지, 중복 허용(아이디가 아니라 부르는 이름). 판정은 서버, 앱은 같은 규칙으로 먼저 안내만.
- **가입 화면은 한 화면**: 닉네임 칸 + 출생 정보 폼 + 마케팅 동의 체크박스를 한 화면에 둔다. 단계식(한 칸씩 넘기기)이 아니다 — 소유자가 참고로 든 폴짝의 화면 방식.
- **마케팅 동의 위치**: 가입 화면 맨 아래, 기본 꺼짐 체크박스 "(선택) 소식 · 혜택 메일 받기". 마이에서 언제든 켜고 끈다.
- **처리 결과 알림**: 동의 · 철회할 때마다 앱 안에 "전송자(별명) · 일시 · 결과(동의/철회)" 를 바로 보여 준다(정보통신망법 시행령 제62조의2의 처리 결과 통지를 앱 안 알림으로). 메일 발송 기능이 생기면 메일로도 보낸다.
- **마이에 보이는 것**: 닉네임(바꿀 수 있음) · 이메일(읽기만, "로그인한 계정의 이메일") · 마케팅 수신 스위치. 이메일은 공급자에서만 오므로 앱에서 고치지 않는다.
- **이메일 갱신**: 로그인할 때마다 확인된 ID 토큰에 이메일이 있으면 저장값을 그 값으로 바꾼다(공급자에서 바꾼 주소를 따라간다). 없으면 그대로 둔다.
- **이미 있는 계정(이메일 없음)**: 운영에는 계정이 없다. 스테이징 · 로컬의 개발용(DEV) 계정과 이 변경 전에 만든 계정은 이메일 · 닉네임이 비어 있어도 로그인된다(DB 칸은 null 허용). 이메일 필수는 **새 가입**에만 건다. 마이는 빈 값을 "없음" 으로 보여 주고 닉네임은 그 자리에서 넣게 한다.
- **공유 카드**: 궁합 점수 카드의 "내 이름" 칸을 닉네임으로 미리 채운다(바꿀 수 있음). 서버 공유 계약은 그대로.
- **로그 · 감사 기록**: 이메일 · 닉네임은 로그에 남기지 않는다. 마케팅 동의 · 철회는 감사 기록(행위자 USER, 값 없이 "동의/철회")으로 남긴다.
- **처리방침 개정 공지**: 출시 전이라 동의한 사용자가 없다 — 30일 사전 공지 없이 시행일을 바꿔 개정한다.

## 범위 밖
- 실제 마케팅 메일 발송 기능(서버 메일 발송 · 제목 "(광고)" 표기 · 야간 전송 동의) — 첫 마케팅 메일을 보내기 전에 따로 계획한다. 다만 **2년 동의 확인 안내**는 그 계획의 필수 항목으로 넘긴다(아래 S8).
- 공급자 이름 · 프로필 사진 받기, 닉네임 중복 검사, 이메일로 계정 합치기(같은 이메일 다른 공급자 = 다른 계정 그대로).
- 앱 안 처리방침 · 약관 화면(지금 자리표시)을 랜딩 글로 잇기 — 출시 준비에서 따로.
- 카카오 연결 해제 웹훅 — 서버 계획에 이미 올라감.

## 전역 제약
- 이메일: 254자 이하(서버 `inquiry/Inquiry.kt` 의 `EMAIL_MAX` 와 같은 한도). 공급자가 "확인됨" 이라 한 값만 쓴다(구글 `email_verified`, 애플 `email_verified`; 카카오는 S2 가 공식 문서로 확인한 규칙).
- API 이름: `nickname` · `email` · `marketingConsent`(boolean) · `marketingConsentAt`(ISO-8601 문자열 | null). 오류 이름: `EMAIL_REQUIRED` · `INVALID_NICKNAME`.
- DB 변경은 더하기만(새 칸은 null 허용). 기존 칸을 지우거나 바꾸지 않는다.
- 이메일 · 닉네임 · 출생 정보를 로그 · 공유 응답 · 분석 이벤트에 남기지 않는다.
- 문구는 `src/content/strings.ts`, 색 · 간격은 `src/constants/theme.ts` 에서만.
- 순서: **카카오 콘솔 동의항목(O1) 먼저** → 카카오 범위를 넓힌 앱 배포(A2). 반대 순서면 카카오가 설정 안 된 범위라며 로그인 자체를 막는다.
- 처리방침 개정(L1)은 이메일을 실제로 받기 시작하는 배포(서버 S4 · 앱 A2)보다 먼저 또는 같은 날 공개한다.

## API 계약 스케치 (이름만 — 확정은 서버 S1 · S9)
| 경로 | 바뀌는 것 |
|---|---|
| `POST /auth/login` | 새 사람인데 확인된 이메일이 없으면 가입권 대신 400 `EMAIL_REQUIRED`. 계정이 있으면 지금처럼 세션(이메일이 있으면 갱신) |
| `POST /auth/signup` | 본문에 `nickname`(필수) · `marketingConsent`(선택, 기본 false) 추가. 이메일은 가입권에 담긴 값. 닉네임이 틀리면 400 `INVALID_NICKNAME` |
| `GET /account` (새) | `{ nickname \| null, email \| null, provider, marketingConsent, marketingConsentAt \| null }` |
| `PATCH /account` (새) | `{ nickname?, marketingConsent? }` → `GET /account` 와 같은 형태. 동의 바꿈은 일시를 새로 적는다 |
| `DELETE /account` | 그대로(계정 행과 함께 이메일 · 닉네임 · 동의 기록이 지워진다) |

## 태스크

### 1. app-adr-039  · 상태: 완료  · [앱]
- 읽을 것: 이 계획 전부, `docs/decisions/034-social-login-platforms.md`, 서버 결정 021
- 할 것: `docs/decisions/039-social-email-nickname-marketing.md` — 결정: 소셜에서 이메일만 필수로 받는다(카카오 웹 `scope=openid account_email`, 애플 웹 `scope: 'email'` · iOS `requestedScopes: [EMAIL]`, 구글은 이미 ID 토큰에 있음), 가입 화면에 닉네임 · 마케팅 동의, 마이에 닉네임 · 이메일 · 동의 스위치, 처리 결과 알림은 앱 안. 034 의 카카오 `scope=openid` 줄에 "039 가 대체" 표시만 단다(본문 고쳐 쓰지 않음).
- 주는 것: 결정 번호 039, 위 API 이름
- 하지 말 것: 서버 결정을 앱 ADR 로 대신하지 않는다. 이유: 서버 계약은 서버 저장소의 ADR 이 원본이다.
- 검증: `ls docs/decisions/039-*.md` → 파일 1개, `grep -n "039" docs/decisions/034-social-login-platforms.md` → 대체 표시 1줄
- 실행 패턴: 혼자
- 결과 요약: `docs/decisions/039-social-email-nickname-marketing.md` 작성, 034 의 카카오 `scope=openid` 칸에 "039 가 대체" 표시(커밋 2ddc46f).

### 2. server-request  · 상태: 진행(서버 세션에 보냄)  · [서버 — 서버 세션에 요청]
서버 저장소에서 서버 세션이 계획(/plan-feature)으로 진행한다. 앱 세션은 아래 블록을 그대로 보낸다. 서버의 ADR · 마이그레이션 번호는 서버 세션이 develop 기준으로 정한다(지금 결정은 023, 마이그레이션은 V18 까지 보임).
- S1 ADR: 결정 021 의 "이메일 · 이름은 받지 않는다(V2)" 를 대체 — 이메일(확인된 값, 새 가입 필수) · 닉네임(가입 때 필수) · 마케팅 동의(선택, 일시) · `GET/PATCH /account`. `V2__accounts_sessions_profiles.sql` 의 "이메일 같은 다른 정보는 받지 않는다" 주석은 새 마이그레이션 주석으로 바로잡는다.
- S2 토큰 확인: `ProviderIdentity` 에 `email: String?`. 구글 · 애플은 `email_verified` 가 참일 때만, 카카오는 공식 문서(OIDC ID 토큰의 `email` 클레임 조건 · 확인 여부)를 확인해 규칙을 ADR "공급자 값" 표에 적는다. 카카오 웹 코드 교환 경로도 같은 확인을 탄다.
- S3 마이그레이션(더하기만): `accounts.email text null` · `accounts.nickname text null` · `accounts.marketing_consented_at timestamptz null`(null = 동의 안 함), `signup_tickets.email text`(가입권에 확인된 이메일을 담는다).
- S4 로그인 · 가입: 새 사람 + 이메일 없음 → 400 `EMAIL_REQUIRED`(가입권을 만들지 않는다). 있는 계정 → 세션, 토큰에 이메일이 있으면 갱신. `POST /auth/signup` 이 `nickname` · `marketingConsent` 를 받아 계정과 한 트랜잭션에 저장. 닉네임 규칙은 이 계획 "내 결정" 그대로.
- S5 `GET /account` · `PATCH /account`: 소유자는 세션에서만. 동의를 바꾸면 `marketing_consented_at` 을 지금(동의) 또는 null(철회)로, 감사 기록(값 없이 동의/철회).
- S6 탈퇴: `DELETE /account` 가 이 칸들을 계정 행과 함께 지우는지 테스트로 지킨다. 애플 서버 알림 `email-disabled`(릴레이 전달 끔)는 이번엔 받기만 하고 무시한다 — 메일 발송 계획(S8)에서 다룬다.
- S7 계약 표: `docs/architecture.md` "API 계약" 의 위 경로를 같은 커밋에서 고치고 앱 세션에 알린다.
- S8 (나중, 메일 발송 계획의 필수 항목): 마케팅 메일 발송 · 2년마다 수신 동의 확인 안내 · 동의/철회 결과 메일. 첫 마케팅 메일 전에 반드시 끝낸다.
- 검증: 서버 `/verify`(`./gradlew build`) 통과 + 새 테스트 — 이메일 없는 새 사람 400 `EMAIL_REQUIRED`(가입권 0건), 가입 때 닉네임 빈 값 · 21자 · 줄바꿈 400 `INVALID_NICKNAME`, 동의 켜고 끄면 일시가 생기고 사라짐, 탈퇴 뒤 이메일 · 닉네임 0건, 로그에 이메일이 없음
- 실행 패턴: 서버 세션(별도 저장소)
- 결과 요약:

### 3. app-scopes  · 상태: 대기  · [앱] (O1 끝난 뒤 배포)
- 읽을 것: 결정 039, `src/features/auth/providers/web-redirect.ts` · `apple.web.tsx` · `apple.ios.tsx` · `kakao.tsx` · `google.tsx` · `google.web.tsx`, 그 테스트
- 할 것: 카카오 웹 인가 주소 `scope` 를 `openid account_email` 로, 애플 웹 `init` 의 `scope` 를 `'email'` 로, 애플 iOS `requestedScopes` 를 `[AppleAuthenticationScope.EMAIL]` 로. 머리 주석의 "이름 · 이메일은 묻지 않는다" 를 039 기준으로 바꾼다. 카카오 네이티브 · 구글은 코드 변경 없음(콘솔 동의항목 · 기본 범위로 온다) — 주석에 이유 한 줄.
- 하지 말 것: 공급자가 준 이메일을 앱이 읽어 서버로 따로 보내지 않는다. 이유: 서버가 ID 토큰에서 확인한 값만 믿는다.
- 검증: `npm test -- web-redirect` 에서 `scope: 'openid account_email'` 기대로 먼저 바꿔 실패를 본 뒤 통과. 애플 웹 · iOS 테스트가 있으면 같은 방식
- 실행 패턴: 혼자
- 결과 요약:

### 4. app-api-account  · 상태: 대기  · [앱] (S7 계약 확정 뒤)
- 읽을 것: 서버 `docs/architecture.md` 의 새 계약 행, `src/lib/api.ts`(`signup` · `login` · 응답 검증 함수), `src/features/auth/use-session.ts` · `session-store.ts`
- 할 것: `api.signup(signupToken, birth, extra: { nickname: string; marketingConsent: boolean })`, `api.getAccount(): Promise<ApiResult<Account>>`, `api.updateAccount(patch: { nickname?: string; marketingConsent?: boolean }): Promise<ApiResult<Account>>`, `type Account = { nickname: string | null; email: string | null; provider: string; marketingConsent: boolean; marketingConsentAt: string | null }`(응답은 기존 방식대로 구조 검증). 로그인 결과에 `EMAIL_REQUIRED` 를 이름으로 넘겨 `lastError` 로 쓸 수 있게 한다. `completeSignup` 이 닉네임 · 동의를 받아 넘긴다.
- 주는 것: `Account` 타입, `getAccount` · `updateAccount`, `lastError === 'EMAIL_REQUIRED'`
- 하지 말 것: 이메일 · 닉네임을 기기 저장소에 따로 두지 않는다. 이유: 서버가 원본이고 공유 기기에 개인정보가 남는다.
- 검증: `npm test -- api` 에 새 함수의 성공 · 구조 틀림 · `EMAIL_REQUIRED` 테스트를 먼저 쓰고 실패 → 통과
- 실행 패턴: 혼자
- 결과 요약:

### 5. app-signup-screen  · 상태: 대기  · [앱]
- 읽을 것: `src/app/signup.tsx`, `src/features/chart/birth-form.tsx`(`submit` 이 오류 문구를 돌려주는 방식), `src/components/field.tsx` · `checkbox.tsx`, 태스크 4 의 `completeSignup`, `src/app/login.tsx`(`reasonMessage`)
- 할 것: 가입 화면 한 화면에 닉네임 칸(위) · 출생 정보 폼 · "(선택) 소식 · 혜택 메일 받기" 체크박스(기본 꺼짐, 설명 한 줄 + 처리방침 링크). 닉네임이 규칙에 어긋나면 서버에 보내기 전에 칸 아래에 안내, 서버의 `INVALID_NICKNAME` 도 같은 문구. 동의하고 가입했으면 처리 결과 알림(전송자 · 일시 · 동의)을 한 번 보여 준다. 로그인 화면 `reasonMessage` 에 `EMAIL_REQUIRED` 문구("이메일 제공에 동의해야 가입할 수 있어요" 류, 공급자 이름 없이).
- 하지 말 것: 한 칸씩 넘기는 단계식으로 쪼개지 않는다. 이유: 소유자가 고른 화면 방식(폴짝).
- 검증: `npm test -- signup` — 닉네임 빈 값이면 서버를 부르지 않음, 체크박스 기본 꺼짐, 동의 값이 `completeSignup` 에 그대로 감, `EMAIL_REQUIRED` 안내. 테스트 먼저 실패 확인
- 실행 패턴: 혼자
- 결과 요약:

### 6. app-my-account  · 상태: 대기  · [앱]
- 읽을 것: `src/app/my.tsx`(결정 038 순서), 태스크 4 의 `getAccount` · `updateAccount`, `src/components/list-row.tsx` · `sheet.tsx`
- 할 것: 마이 맨 위 카드에 닉네임(누르면 바꾸기 시트) · 이메일(읽기만, 없으면 "없음"), "도움" 위에 "알림 · 수신" 줄로 마케팅 메일 스위치. 바꿀 때마다 처리 결과 알림(전송자 · 일시 · 동의/철회). 닉네임이 없는 옛 계정은 카드에서 바로 넣게 한다.
- 하지 말 것: 이메일 바꾸기 화면을 만들지 않는다. 이유: 이메일은 공급자에서만 온다.
- 검증: `npm test -- my-screen` — 닉네임 · 이메일 표시, 이메일 null 이면 "없음", 스위치가 `updateAccount({ marketingConsent })` 를 부르고 결과 알림, 실패하면 스위치가 원래대로
- 실행 패턴: 혼자
- 결과 요약:

### 7. app-share-name  · 상태: 대기  · [앱]
- 읽을 것: `src/features/share/share-entry.tsx`(`MyNameForm`), 태스크 4 의 `getAccount`
- 할 것: 궁합 점수 카드의 "내 이름" 칸 초깃값을 닉네임으로(있을 때만). 바꿀 수 있고 한도 20자 그대로.
- 하지 말 것: 서버 공유 계약(`myName`)을 바꾸지 않는다. 이유: 범위 밖, 서버 변경 없이 된다.
- 검증: `npm test -- share-entry` — 닉네임이 있으면 칸이 채워져 있고, 없으면 빈 칸
- 실행 패턴: 혼자
- 결과 요약:

### 8. landing-privacy (L1)  · 상태: 대기  · [랜딩] (소유자가 문구 확인)
- 읽을 것: 랜딩 저장소 `app/data/legal.ts`, 지금 https://byeolmyeong.com/privacy · /terms
- 할 것: 처리방침 — 수집 항목(회원가입: 소셜 로그인 식별값 · **이메일(공급자 제공, 필수)** · **닉네임(필수)** · 출생 정보, 선택: **마케팅 수신 동의 여부 · 일시**), 이용 목적(서비스 안내 · 고객 응대, 동의한 경우 소식 · 혜택 안내), 보유 기간(탈퇴 시 바로 삭제, 동의 기록은 철회 · 탈퇴까지), 처리 위탁(메일 발송 업체 — 발송을 시작할 때), 마케팅 동의 철회 방법(마이 → 알림 · 수신). "이메일 · 이름 · 프로필 정보는 받지 않습니다" 문장을 지운다. 시행일을 바꾼다. 약관은 "회원에게 이메일로 안내할 수 있다" 한 조항만 확인.
- 하지 말 것: 소유자 확인 없이 공개하지 않는다. 이유: 법적 고지문이다.
- 검증: 배포 뒤 `curl -s https://byeolmyeong.com/privacy` 에 "이메일" 수집 항목이 있고 "받지 않습니다" 문장이 없음
- 실행 패턴: 혼자(랜딩 저장소, main 단일 브랜치)
- 결과 요약:

### 9. owner-console  · 상태: 진행(O1 완료 · O2 대기)  · [소유자 콘솔]
- O1 카카오: 카카오 로그인 → 동의항목 → 카카오계정(이메일) → **필수 동의**, 목적 "서비스 안내 메일". 비즈 앱 전환을 요구하면 전환(사업자 또는 개인 개발자 비즈 앱). 전환하지 않기로 하면 **선택 동의**로 켜고, 이메일을 안 준 사람은 서버가 `EMAIL_REQUIRED` 로 막는다(앱이 다시 동의하라고 안내).
- O2 애플: Certificates, Identifiers & Profiles → Services → Sign in with Apple for Email Communication → 도메인 `byeolmyeong.com` 과 보내는 주소(예: `noreply@byeolmyeong.com`)를 등록(SPF · DKIM 은 Resend 설정으로 이미 있음). 릴레이 주소로 메일이 가려면 필요 — 첫 메일 전까지.
- O3 구글: 할 것 없음(ID 토큰에 이메일이 기본으로 든다). 동의 화면 범위에 민감한 범위를 더하지 않는다.
- 검증: O1 뒤 카카오 로그인 동의 화면에 "카카오계정(이메일) 필수" 가 보인다(소유자 캡처)
- 결과 요약:

## 검증 (전체 완료 판정)
- 앱 `/verify` 표 전부 통과(`npx tsc --noEmit && npx expo lint` · `npm test` · `npx expo export --platform web` · `npx expo-doctor`).
- 서버 `/verify` 통과.
- 스테이징(https://app.staging.byeolmyeong.com)에서 공급자마다 새 계정으로: 가입 화면에 닉네임 · 동의 체크박스 → 가입 → 마이에 닉네임 · 이메일이 보이고 `GET /account` 의 `email` 이 공급자 계정의 주소. 동의 스위치를 켜고 끄면 결과 알림과 `marketingConsentAt` 이 바뀐다. 탈퇴 뒤 다시 로그인하면 가입부터.
- 처리방침에 이메일 · 닉네임 · 마케팅 동의가 적혀 있다.

## 리뷰 초점 (어떤 태스크의 테스트도 안 치는 입력 · 조건)
1. **애플 "이메일 가리기"**: `@privaterelay.appleid.com` 주소가 온다 — 그대로 저장하고 이메일로 친다(S2 테스트에 릴레이 주소 1건). 실제 전달은 O2 뒤에만 된다.
2. **애플 재로그인**: 이 변경 전에 이메일 범위 없이 별명을 승인한 애플 계정은 다시 묻지 않아 토큰에 이메일이 없을 수 있다 — 있는 계정이면 로그인되고(이메일 null), 새 가입이면 `EMAIL_REQUIRED`. 테스터는 애플 ID 설정에서 앱 연결을 끊고 다시 시도해야 한다(S4 테스트 + 스테이징 확인 메모).
3. **카카오 이메일 없음 · 미확인**: 이메일 동의를 안 했거나(선택 동의일 때) 카카오계정에 확인된 이메일이 없으면 → 새 가입 400 `EMAIL_REQUIRED`, 앱 안내 문구(S2 · 태스크 5 테스트).
4. **공급자에서 이메일을 바꾼 사람**: 다음 로그인 때 저장값이 새 주소로 바뀐다. 마케팅 동의는 계정에 붙어 그대로(S4 테스트).
5. **이미 있는 계정(DEV · 변경 전 계정)**: 이메일 · 닉네임 null 로 `GET /account` 가 깨지지 않고, 마이가 "없음" 과 닉네임 넣기를 보여 주며, 공유 카드 칸은 빈 칸(태스크 6 · 7 테스트).

## 자동 반복
- 하지 않는다. 앱 · 서버 · 랜딩 · 콘솔이 엇갈려 순서가 중요하고, 소유자 확인(문구 · 콘솔)이 끼어 있다.

## 위험 · 되돌리기
- **카카오 범위 먼저 배포** → 카카오가 설정 안 된 동의항목이라며 로그인 전체를 막는다. 막기: O1 확인 뒤에만 태스크 3 을 develop 에 합친다. 되돌리기: 태스크 3 커밋 되돌림(앱 배포 1회).
- **처리방침보다 수집이 먼저** → 고지 없는 수집. 막기: L1 공개 확인 뒤 S4 · 태스크 3 배포.
- **카카오 필수 동의에 비즈 앱 전환 필요** → 소유자가 전환함(2026-11-19). 필수 동의로 설정한다.
- DB 는 더하기만이라 서버를 되돌려도 데이터가 깨지지 않는다(새 칸만 남음).
- 처리 결과 알림을 앱 안으로만 하는 해석이 틀리면 → 메일 발송 기능(S8)과 함께 메일로 보낸다. 비용: 메일 발송 계획을 앞당김.

## 실행 기록
- 2026-11-19 소유자 "승인". 소유자가 카카오 비즈 앱 전환 · 이메일 필수 동의 설정(O1 완료, 소유자 말).
- 결정: 작업 브랜치 `feat/social-email-nickname` 을 `feat/vercel-deploy`(#27) 위에 쌓음 — 이 계획이 #23(마이) · #24(공유 카드)의 코드를 고치기 때문 — 같은 날 소유자 "합쳐" 로 #22 → #23 → #24 → #27 이 develop 에 합쳐져 기준은 develop 이 됨(gh pr edit 은 토큰 권한 부족으로 실패 → REST `PATCH /pulls/{n}` base=develop 로 바꿈, 바꾼 뒤 파일 수가 예전 기준과 같음을 확인: 18 · 69 · 11).
- 태스크 1 검증:
```
$ ls docs/decisions/039-*.md
docs/decisions/039-social-email-nickname-marketing.md
$ grep -n "039" docs/decisions/034-social-login-platforms.md
25:   | 카카오 | 카카오 인가 주소로 이동(`scope=openid` — 결정 039 가 `openid account_email` 로 대체) → ...
```

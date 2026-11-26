---
type: release
tags: [1.0.0, App Store, 심사, 스토어 문안, 개인정보 라벨, 연령 등급, 스크린숏, 제출 전 점검]
status: active
last_reviewed: 2026-11-26
---
# 별명 iOS 1.0.0 App Store 심사 제출 문안과 제출 전 점검

> 상태: 활성 · 기준 2026-11-26 develop(7a8d3b5, #121 까지) · 1.0.0 범위는 docs/release-1.0.0.md 가 단일 출처다(궁합 · 랭킹 · 음악은 1.1.0, 결정 055 · 069 / 공유는 이미지뿐, 결정 053) · 11-23 초안(본 체크아웃에 추적되지 않은 파일)을 1.0.0 범위에 맞춰 다시 썼다.
>
> 스토어에 붙여 넣는 글(이름 · 부제 · 홍보 문구 · 설명 · 키워드 · 심사 메모)에는 긴 줄표를 쓰지 않고, 띄어 쓴 가운뎃점으로 늘어놓지 않는다(소유자 2026-11-26 "AI 티가 난다"). 목록은 쉼표나 문장으로 푼다.
>
> 표시: ✅ 코드 · 실제 응답으로 확인 / ⚠ 제출 전에 소유자가 정하거나 고칠 것.

## 한눈에

| 칸 | 값 | 글자 수 · 한도 | 상태 |
|---|---|---|---|
| 앱 이름 | 별명 | 2 / 30 | ⚠ App Store Connect 에서 앱을 만들 때 쓸 수 있는지 나온다(대안 셋은 아래) |
| 부제 | 점성술 몰라도 읽히는 출생 차트 풀이 | 20 / 30 | ✅ 랜딩 제목과 같은 말 |
| 홍보 문구 | 아래 | 105 / 170 | ✅ |
| 설명 | 아래 | 921 / 4,000 | ✅ 1.0.0 기능만 |
| 키워드 | 아래 | 88 / 100 | ✅ |
| 기본 카테고리 · 보조 | 라이프스타일 · 엔터테인먼트 | | ✅ |
| 연령 등급 | 16+(설문 계산 4+ 를 약관 만 14세에 맞춰 올림) | | ✅ 소유자 결정 2026-11-26 |
| 지원 URL | https://byeolmyeong.com/ | | ✅ 소유자 결정 2026-11-26 · ⚠ 랜딩 바닥글 "문의 support@byeolmyeong.com" 이 운영에 올라간 뒤 입력 |
| 마케팅 URL | https://byeolmyeong.com/ | | ✅ 200 |
| 개인정보 처리방침 URL | https://byeolmyeong.com/privacy | | ✅ 200 · ⚠ 소유자가 승인한 개정(앰플리튜드 · Expo 위탁, 바로 시행)이 운영에 올라간 뒤 제출 |
| 저작권 | 2026 별명 | | ✅ 랜딩 바닥글 "© 2026 별명" 과 같다 |
| 가격 · 배포 국가 | 무료 · 대한민국 | | ⚠ 소유자가 고른다(한국어 · 국내 출생지만이라 대한민국 권장) |
| 심사 로그인 | Sign in with Apple 로 바로 가입(데모 계정 없음) | | ✅ |
| App Privacy | 아래 표(추적 안 함) | | ✅ 93 줄 목록과 맞춤 · 대략적 위치(분석)는 적는다(소유자 2026-11-26) |
| 스크린숏 | 6.9" 1320×2868, 8장 | | ⚠ 운영 빌드 화면으로 찍기 |

## 1. 스토어 정보(한국어, 그대로 붙여 넣기)

### 앱 이름
별명

"별명" 을 쓸 수 없다고 나오면 차례대로(모두 30자 안):
1. 별이 지어 준 별명 (10자)
2. 별명 출생 차트 풀이 (11자)
3. 나의 별명 별자리 풀이 (12자)

- 앱 이름은 App Store 전체에서 하나뿐이고, 내지 않은 앱이 잡아 둔 이름도 쓸 수 없다. 그래서 앱을 만들 때에야 확인된다.
- 2026-11-26 한국 App Store 검색(iTunes Search API, "별명")에 같은 이름의 앱은 없었다. 비슷한 것은 "FF : 별명 생성기", "내닉 - AI 닉네임 생성기" 정도다.
- 같은 계정에 테스트앱 "별명 테스트"(ascAppId 6836723418)가 이미 있다. 운영앱은 따로 만든다.
- 결정 032(이름 "별명" 유지), 결정 013 의 상표 확인은 아직 "[확인 필요]" 다(docs/release-1.0.0.md "사용자만 할 수 있는 준비").

### 부제 (20자)
점성술 몰라도 읽히는 출생 차트 풀이

### 홍보 문구 (105자)
태어난 순간의 하늘로 지은 나만의 별명을 받아 보세요. 성격, 연애, 관계, 일, 감정을 쉬운 말로 풀어 드리고, 이번 달 눈여겨볼 날부터 인생의 다음 큰 변화까지 내 차트로 짚어 드려요.

### 설명
```
태어난 날의 하늘이 나에게 이름을 지어 준다면 어떤 말일까요?

별명은 생년월일, 태어난 시각, 태어난 곳으로 그날의 하늘을 계산하고, 점성술 용어 없이 나를 설명하는 글로 풀어 드려요. 태어난 시각을 몰라도 시작할 수 있어요.

나만의 별명
내 출생 차트로 지은 한 줄 별명과 나를 설명하는 글을 받아요. 문단마다 "이렇게 풀이한 이유"를 함께 보여 드려서, 어느 별이 어떤 자리에 있었기에 그렇게 읽었는지 알 수 있어요. 낯선 말에는 짧은 뜻을 붙여 두었어요.

나를 더 자세히
성격, 연애, 관계, 일, 감정 다섯 가지로 나를 더 깊이 읽어요. 영역마다 한눈에 보는 정리와 바로 해 볼 수 있는 작은 실천을 담았어요.

나의 시기
이번 달 달력에서 눈여겨볼 날을 확인하고, 올해의 흐름과 인생의 다음 큰 변화가 언제쯤인지 살펴봐요. 같은 나이라도 사람마다 다른, 내 차트에서 나온 시기예요.

오늘의 하늘
매일 아침 오늘 하늘이 나에게 어떤 날인지, 흐름 세 가지와 작은 실천 세 가지로 알려 드려요. 원하는 시간에 알림으로 받을 수 있어요. 달력에서 다른 날을 누르면 그날의 하늘도 볼 수 있어요.

내 하늘 지도
태어난 순간 별마다 있던 자리와 별끼리의 관계를 그림으로 봐요.

공유 카드
내 별명, 오늘의 하늘, 인생의 다음 큰 변화를 인스타그램 스토리 크기의 카드로 공유하거나 사진 앱에 저장해요. 카드에는 출생 정보가 들어가지 않아요.

이용 안내
Apple, Google, 카카오 계정으로 가입하고 출생 정보를 넣으면 시작해요. 만 14세 이상부터 이용할 수 있어요. 지금은 한국어와 국내 출생지만 지원해요. 모든 기능을 무료로 이용할 수 있고 광고가 없어요.

별명의 글은 출생 차트를 바탕으로 한 오락과 자기 성찰을 위한 내용이에요. 건강, 돈, 앞으로 일어날 일을 단정하지 않으며 의료, 법률, 재무 상담을 대신하지 않아요.
```

근거(설명의 문장마다): 별명 · 이유 · 용어 뜻(F3, 결정 054) · 다섯 영역과 작은 실천(F4, 결정 048) · 이번 달 · 올해 · 인생(결정 049) · 오늘의 하늘 · 그날의 하늘 · 알림 시간(결정 051 · 057 · 066) · 내 하늘 지도(F2) · 공유 카드 넷 중 셋(내 별명 · 오늘의/그날의 하늘 · 다음 큰 변화, 나 탭 영역 카드도 있다)과 인스타그램 스토리 · 이미지 저장, 링크 없음(결정 053) · 로그인 셋 · 만 14세(결정 009 · 034) · 한국어 · 국내 출생지 · 무료 · 광고 없음(release-1.0.0 "사용자 결정").
- 넣지 않은 것: 궁합 · 랭킹 · 초대 링크(1.1.0, 결정 055), 링크 공유(결정 053), 음악(결정 069), "1.1.0 부터 유료"(앞일을 약속하지 않는다).

### 키워드 (88자)
```
별자리,서양점성술,네이탈차트,호로스코프,오늘의하늘,성격,연애,자기이해,시기,별,태양,달,상승궁,하늘지도,토성리턴,생일,행성,하우스,변곡점,성향,인생,관계,감정
```
- 이름 · 부제에 이미 있는 낱말(별명 · 점성술 · 출생 · 차트 · 풀이)은 뺐다. 1.0.0 에 없는 기능(궁합)은 넣지 않았다.

### 카테고리
- 기본: 라이프스타일. 보조: 엔터테인먼트.
- App Store 에 점성술 카테고리가 없고, 결과는 자기 이해를 위한 글이다. 오락 성격(약관 · 설명의 안내)은 보조로 둔다.

### 주소
| 칸 | 값 | 확인(2026-11-26 curl) |
|---|---|---|
| 지원 URL | https://byeolmyeong.com/ | 200. 바닥글 연락처 한 줄은 랜딩 PR 에서 넣는다 |
| 마케팅 URL | https://byeolmyeong.com/ | 200 |
| 개인정보 처리방침 URL | https://byeolmyeong.com/privacy | 200(시행일 2026년 11월 20일) |

지원 URL(소유자 결정 2026-11-26): `https://byeolmyeong.com/` 으로 하고, 랜딩 바닥글에 "문의 support@byeolmyeong.com" 한 줄을 넣는다.
- 애플은 지원 URL 에서 연락할 방법이 보여야 한다고 본다. 지금은 연락처가 처리방침 제11조에만 있어 바닥글에 한 줄을 더한다.
- 앱 안에는 여전히 문의 메일 주소를 적지 않는다(결정 024 · 058, 앱 안 문의로 받는다). 바닥글의 메일은 웹을 보는 사람과 심사용 연락처다.
- 랜딩 main 이 곧 운영이라 소유자가 "합쳐" 해야 올라간다. 올라간 것을 본 뒤 App Store Connect 에 지원 URL 을 넣는다.

### 저작권
2026 별명

- 판매자 이름(Seller)은 개발자 계정의 이름이 나온다. 이 칸과는 따로다.

## 2. 연령 등급

설문 답(App Store Connect 의 2025년 이후 설문, 2026-11 기준 항목):

| 묶음 | 항목 | 답 | 근거 |
|---|---|---|---|
| 앱 안의 통제 | 보호자 통제(Parental Controls) | 없음 | 앱에 보호자 기능이 없다 |
| | 연령 확인(Age Assurance) | 없음 | 생년월일로 만 14세 미만 가입을 막지만(서버가 판정, 결정 009 · 서버 결정 021), 신분 확인 같은 연령 보증은 아니다. "있음" 으로 답해도 등급은 4+ 그대로다 |
| 기능 | 제한 없는 웹 접근 | 없음 | 앱 안 브라우저가 없다. 처리방침 · 약관은 앱 안 글(`/settings/privacy` · `/settings/terms`) |
| | 사용자 생성 콘텐츠 | 없음 | 다른 사람에게 퍼지는 글이 없다. 닉네임과 문의는 다른 이용자에게 보이지 않는다. 공유 카드는 서버가 만든 정해진 카드(결정 053) |
| | 소셜 미디어 | 없음 | 친구 · 피드 · 팔로우가 없다(친구창은 1.1.0) |
| | 메시지 · 채팅 | 없음 | 문의는 운영자와의 1:1 문의다(결정 058) |
| | 위치 공유 | 없음 | 기기 위치를 쓰지 않는다. 출생지는 목록에서 고르는 과거 장소 |
| | 광고 | 없음 | 1.0.0 은 광고 없음(광고는 1.1.0, 결정 008 · 015) |
| 성숙한 주제 | 비속어 · 거친 유머 | 없음 | |
| | 공포 | 없음 | |
| | 술 · 담배 · 약물 | 없음 | |
| | 데이트 · 연애 관계(Dating and Relationships) | 없음 | 만남 · 매칭 서비스나 연애 상대를 흉내 내는 가상 동반자가 없다. 연애 칩은 내 차트를 읽은 글과 작은 실천이다 |
| 의료 · 건강 | 의료 · 치료 정보 | 없음 | 건강을 단정하지 않는다(golden-rules 프로젝트 규칙) |
| | 건강 · 웰니스 주제 | 없음 | 감정 칩은 성향을 읽는 글이지 건강 정보가 아니다 |
| 성적 내용 | 셋 모두 | 없음 | |
| 폭력 | 넷 모두 | 없음 | |
| 우연 · 사행 | 도박 · 모의 도박 · 경품 · 루트 박스 | 없음 | 결제 · 뽑기가 없다 |

결과: 4+ 로 계산될 것이다.

결정(소유자 2026-11-26): 16+ 로 올린다(Override to Higher Age Rating).
- 애플 도움말은 "이용약관(EULA)이 정한 최소 나이가 계산된 등급보다 높으면 그 나이에 맞도록 더 높은 등급으로 올려야 한다" 고 한다. 우리 약관은 만 14세 이상이다(결정 009).
- 단계가 4+ · 9+ · 13+ · 16+ · 18+ 라 14세를 덮는 가장 낮은 단계가 16+ 다. 만 14~15세는 스크린 타임 제한을 켠 기기에서 받을 수 없지만, 약관과 스토어 등급이 맞아 2.3.6(연령 등급 정확성)으로 걸릴 일이 없다.
- 지역마다 따로 올리는 칸(한국 등)이 보이면 같은 뜻으로 14세를 덮는 단계를 고른다.
- "Made for Kids" 는 고르지 않는다.

## 3. App Privacy(개인정보 영양 라벨)

추적(Tracking): 하지 않는다. 광고 식별자(IDFA)를 읽지 않고 ATT 창을 띄우지 않는다(결정 040 의 5 · 081). 모은 정보를 다른 회사의 데이터와 엮거나 데이터 중개인에게 넘기지 않는다.

| 애플 분류 | 무엇 | 모음 | 사용자와 연결 | 목적 | 근거 |
|---|---|---|---|---|---|
| 연락처 정보 › 이메일 주소 | 소셜 로그인이 주는 이메일(Apple '이메일 가리기'면 전달용 주소) | 예 | 예 | 앱 기능. 마케팅 수신에 동의한 사람에게 이메일로 소식을 보낸다면 "개발자의 광고 또는 마케팅" 도 고른다 | 처리방침 제2조, 결정 039 |
| 식별자 › 사용자 ID | 계정 id · 소셜 로그인 식별자(서버), 분석용 id(계정 id 의 되돌릴 수 없는 해시, 앰플리튜드로 보냄. 서버가 다시 만들 수 있어 "연결됨") | 예 | 예 | 앱 기능, 분석 | 결정 081 의 3 |
| 식별자 › 기기 ID | 앰플리튜드가 앱 저장소에 만드는 임의의 기기 id(가입 전 이벤트를 잇는다). 푸시 토큰(Expo) | 예 | 예 | 분석. 푸시 토큰은 앱 기능 | 결정 040 의 4. IDFA · IDFV 는 끈다(`trackingOptions` adid · idfv false) |
| 사용 데이터 › 제품 상호 작용 | 정해진 이벤트 11개: 앱 열기, 로그인 · 가입, 출생 정보 입력 시작, 차트 · 풀이 보기, 끝까지 읽기, 공유 시트 열기, 화면 이동(경로 패턴). 값은 정해진 목록 · 참거짓만 | 예 | 예 | 분석 | 결정 040 의 2 · 3, 081(93 줄 2026-11-26) |
| 사용자 콘텐츠 › 고객 지원 | 앱 안 문의(종류 · 내용) | 예 | 예 | 앱 기능 | 결정 058 |
| 사용자 콘텐츠 › 기타 사용자 콘텐츠 | 닉네임, 고른 프로필 그림, 공유 카드 내용 | 예 | 예 | 앱 기능 | 결정 039 · 053 · 056. 닉네임은 실명이 아니라 "이름" 이 아니다 |
| 기타 데이터 | 출생 정보(생년월일 필수, 태어난 시각 · 태어난 곳 선택). 사용자가 직접 넣은 값 | 예 | 예 | 앱 기능 | 결정 029. 기기 위치가 아니라 "위치" 가 아니다. 분석 도구로 보내지 않는다(golden-rules) |
| 위치 › 대략적 위치 | 접속 국가 · 지역(앰플리튜드가 접속 정보로 추정할 수 있다) | 예 | 예 | 분석 | 소유자 결정 2026-11-26 "적어 둔다". SDK 는 IP 저장을 끄지만(`trackingOptions.ipAddress` false, #30 부터) 앰플리튜드가 위치를 추정하지 않는다고 보장하지 않는다. 처리방침 제2조 "접속 국가 · 지역(접속 정보로 추정)"(앱 #125 · 랜딩 #8)과 같다. 추적은 아니다 |

모으지 않음: 진단(충돌 · 성능 수집 도구가 없고, 앰플리튜드 진단 전송도 원격 설정을 켜지 않아 꺼져 있다) · 구매 · 금융 · 건강 · 연락처 · 사진(공유 카드를 사진 앱에 넣기만 하고 읽거나 보내지 않는다) · 오디오 · 방문 기록 · 검색 기록(출생지 검색은 기기 안) · 민감 정보.

- 출생 정보를 앰플리튜드 · 로그 · 공유 페이지에 보내지 않는다(golden-rules 프로젝트 규칙, 결정 040 의 3).
- 앰플리튜드는 운영 앱에서만 보낸다. 테스트앱 · 스테이징 · 로컬은 키가 없어 아무것도 보내지 않는다(결정 081 의 2).
- 위 표는 93 줄(제품 분석)이 2026-11-26 보내 준 목록과 맞췄다. 다른 점 둘: 이메일의 마케팅 목적과 푸시 토큰은 보수적으로 더 적었다.
- 처리방침 개정(소유자 승인 2026-11-26): 제5조(위탁 · 국외 이전)에 앰플리튜드(Amplitude, Inc., 미국, 제품 분석)와 Expo(650 Industries, Inc., 미국, 푸시 알림 전달)를 더하고, 분석 기록 보관 1년, 바로 시행한다. 93 줄이 앱 사본(`src/content/legal.ts`, 앱 #125)과 랜딩을 마무리한다(결정 043 · 040 의 7). ⚠ 심사 제출 전에 운영 랜딩 `/privacy` 에 올라간 것을 본다.
- 대략적 위치는 나중에 소유자가 앰플리튜드 지원에 위치 · IP 를 버려 달라고 요청하고 그렇게 된 것을 확인하면 뺄 수 있다. 그때 처리방침 제2조의 같은 줄도 함께 뺀다.

## 4. 심사 메모(App Review Information › Notes)

로그인 칸: "Sign-in required" 를 끄고 아래 메모로 안내한다. 데모 계정은 두지 않는다. 앱의 로그인은 Apple · Google · 카카오뿐이라 비밀번호 계정을 만들 수 없고, 심사자는 Sign in with Apple 로 바로 가입할 수 있다. 심사자가 2.1(데모 계정)로 되돌리면 해결 센터에 같은 안내를 답한다.

연락 담당자(이름 · 이메일 · 전화)는 App Store Connect 에만 적는다. 이 문서와 저장소에는 적지 않는다.

### 영문(그대로 붙여 넣기)
```
Byeolmyeong ("별명", Korean for "nickname") is a Korean-language Western astrology app for users aged 14 and over. Our server calculates each user's natal chart from their birth date, birth time (optional) and birthplace in Korea. The app then explains that chart in plain Korean, without astrology jargon.

How Byeolmyeong is different from typical horoscope apps (Guideline 4.3)
1. Personal, not sun-sign based. Every text is written from the user's own calculated chart: planet positions, houses, aspects and transits are computed on our server. The app does not show the same text to everyone born under one zodiac sign.
2. Every paragraph shows "Why we read it this way" (이렇게 풀이한 이유). It names the exact chart placement behind the paragraph, with a small sky map and a short glossary for unfamiliar words. The server removes any chart placement that does not exist in the user's chart.
3. A nickname written from the stars. After sign-up, the user receives a one-line personal nickname and a reading that explains it.
4. Personal timing. A monthly calendar of notable days, this year's flow, and the next major life transition with the year and age, all computed from the user's own chart.
5. Today's sky. A short daily reading based on today's planets against the user's chart, with optional notifications at a time the user picks.
6. Share cards in Instagram Stories size. Cards never include birth details.
All content is for entertainment and self-reflection. It gives no medical, legal or financial advice and makes no definite predictions about health, money or future events.

Sign-in
An account is required. Please use Sign in with Apple; no demo account is needed. Sign-up has three steps: agree to the terms, choose a nickname and profile picture, then enter birth details. Please enter a birth date at least 14 years ago, because users under 14 cannot sign up (the server checks the age). If you prefer not to enter a birth time, choose "모름" (Unknown); the birthplace is then optional.
Writing the nickname and reading usually takes under a minute (up to three minutes). Each detailed reading also takes about a minute; you can leave the screen and come back.

Where to find things
- 홈 (Home): your nickname card and Today's sky.
- 나 (Me): your reading. Tap "자세한 풀이 받기" (Get detailed reading) for the five-area reading.
- 시기 (Timing): this month's calendar. "자세한 풀이 받기" unlocks this year and life timing.
- 마이 (My): 문의하기 (Contact us, in-app support), 이용약관 (Terms), 개인정보 처리방침 (Privacy Policy).

Account deletion (5.1.1(v))
마이 (My) > tap the profile card at the top (내 정보, My info) > 계정 삭제 (Delete account) at the bottom > check the confirmation > delete. This deletes the account and its data on our server and revokes the Sign in with Apple token.

Permissions
Notifications are requested only when the user taps "알림 받기" (Get notifications) on our own prompt on Home, shown once after the first nickname. Photo library access (add only) is requested only when the user saves a share card image. The app never requests location, contacts or camera. The microphone purpose string comes from the audio module; music is turned off in this version and the app never records.

Other notes
- No in-app purchases, no ads, no tracking (no IDFA and no ATT prompt).
- Korean only. Birthplaces are limited to Korea.
- An internet connection is required.
```

### 한국어 번역(참고용, 붙여 넣지 않음)
```
별명은 만 14세 이상을 위한 한국어 서양 점성술 앱입니다. 서버가 생년월일, 태어난 시각(선택), 국내 출생지로 출생 차트를 계산하고, 앱은 그 차트를 점성술 용어 없이 쉬운 한국어로 풀어 줍니다.

흔한 운세 앱과 다른 점(가이드라인 4.3)
1. 태양 별자리가 아니라 개인 차트. 모든 글은 그 사람의 차트(서버가 계산한 행성 위치, 하우스, 각도, 통과)로 씁니다. 같은 별자리라고 같은 글을 보여 주지 않습니다.
2. 문단마다 "이렇게 풀이한 이유". 그 문단의 근거가 된 차트의 자리를 작은 하늘 지도, 낯선 말의 짧은 뜻과 함께 보여 줍니다. 서버는 그 사람의 차트에 없는 자리가 글에 섞이면 버립니다.
3. 별이 지어 준 별명. 가입하면 한 줄 별명과 그 별명을 설명하는 글을 받습니다.
4. 나만의 시기. 이번 달 눈여겨볼 날, 올해의 흐름, 인생의 다음 큰 변화(해와 나이)를 그 사람의 차트로 계산합니다.
5. 오늘의 하늘. 오늘의 행성과 내 차트로 쓴 짧은 하루 글, 원하는 시간에 알림.
6. 인스타그램 스토리 크기의 공유 카드. 카드에는 출생 정보가 들어가지 않습니다.
모든 글은 오락과 자기 성찰을 위한 것입니다. 의료, 법률, 재무 조언을 하지 않고 건강, 돈, 앞일을 단정하지 않습니다.

로그인
계정이 필요합니다. Sign in with Apple 로 가입해 주세요. 데모 계정은 필요하지 않습니다. 가입은 약관 동의, 닉네임과 프로필 그림, 출생 정보 세 단계입니다. 만 14세 미만은 가입할 수 없으므로(서버가 판정) 14년 이상 전의 생년월일을 넣어 주세요. 태어난 시각을 넣고 싶지 않으면 "모름" 을 고르세요. 그러면 출생지는 넣지 않아도 됩니다.
별명과 글을 짓는 데는 대개 1분이 안 걸리고 길면 3분입니다. 자세한 풀이도 1분 안팎이 걸리며, 화면을 떠났다 돌아와도 됩니다.

찾는 곳
홈: 별명 카드와 오늘의 하늘. 나: 내 풀이, "자세한 풀이 받기" 로 다섯 영역 풀이. 시기: 이번 달 달력, "자세한 풀이 받기" 로 올해와 인생. 마이: 문의하기(앱 안 지원), 이용약관, 개인정보 처리방침.

계정 삭제(5.1.1(v))
마이 > 맨 위 프로필 카드(내 정보) > 맨 아래 계정 삭제 > 확인 체크 > 삭제. 서버의 계정과 그 데이터를 지우고 Sign in with Apple 토큰을 회수합니다.

권한
알림은 첫 별명을 받은 뒤 홈에서 한 번 뜨는 우리 안내의 "알림 받기" 를 누를 때만 묻습니다. 사진 보관함(추가만)은 공유 카드 이미지를 저장할 때만 묻습니다. 위치, 연락처, 카메라는 묻지 않습니다. 마이크 사용 목적 문구는 소리 모듈에서 들어온 것으로, 이 버전은 음악이 꺼져 있고 녹음하지 않습니다.

그 밖
인앱 결제, 광고, 추적(IDFA, ATT 창)이 없습니다. 한국어만, 국내 출생지만 지원합니다. 인터넷 연결이 필요합니다.
```

근거: 계산은 서버(결정 006) · 근거 대조와 버림(release-1.0.0 "계산과 글의 역할 분담") · 이유 · 작은 지도 · 용어(결정 054) · 시기 계산(결정 012 · 049) · 오늘의 하늘(결정 051) · 공유 카드(결정 053) · 가입 단계(결정 042 · 044) · 만 14세(결정 009, 서버 결정 021) · 시각 모름(결정 020 · 042) · 생성 시간(별명 짓는 중 3분 한도 `GENERATION_MAX_WAIT_MS` 180초, 자세한 풀이 "1분 안팎" `src/lib/detail-report.ts`) · 계정 삭제 경로(결정 084 · 056) · 애플 토큰 회수(서버 `auth/AppleSignIn.kt` `revoke`) · 알림 묻는 때(결정 066) · 사진 추가만(app.json `expo-media-library`) · 음악 꺼짐(결정 069).

## 5. 스크린숏(6.9", 1320×2868 세로)

- 아이폰 6.9" 한 벌만 올린다(1320×2868 · 1290×2796 · 1260×2736 모두 이 칸에 들어간다). 다른 아이폰 크기는 선택이다.
- 아이패드는 필요 없다. app.json 에 `supportsTablet` 이 없어 아이폰 전용 빌드다.
- 실제 1.0.0 화면만 쓴다. 궁합 · 랭킹 · 음악 화면은 넣지 않는다. 화면 위에 짧은 한 줄을 얹는 것은 괜찮다.
- 실제 사람의 개인정보가 보이지 않게 예시 닉네임 · 생일을 쓰는 계정으로 찍는다.

| 차례 | 화면 | 보일 상태 | 위에 얹을 한 줄 |
|---|---|---|---|
| 1 | 별명 공개(가입 직후) | 닉네임 · 한 줄 별명 · 해 · 달 · 상승 별자리 | 별이 지어 준 나의 별명 |
| 2 | 내 별명 `/reading` | 첫 문단과 펼친 "이렇게 풀이한 이유"(작은 지도, 결정 083) | 왜 그렇게 읽었는지 이유까지 |
| 3 | 나 탭 받은 뒤 `/me` | 성격 칩, 한눈에 보기 | 성격, 연애, 관계, 일, 감정을 자세히 |
| 4 | 오늘의 하늘 `/today` | 제목 · 흐름 셋 · 작은 실천 | 매일 아침, 나에게 오는 하늘 |
| 5 | 시기 이번 달 `/timing` | 달력의 눈여겨볼 날 점과 목록 | 이번 달 눈여겨볼 날 |
| 6 | 시기 인생 `/timing?tab=life` | 다음 큰 변화(해 · 만 나이) | 인생의 다음 큰 변화는 언제쯤 |
| 7 | 내 하늘 지도 `/chart` | 휠과 고른 별 하나 | 태어난 순간의 하늘 지도 |
| 8 | 공유 미리보기 | 내 별명 카드(9:16) | 출생 정보 없이 공유하는 카드 |

- 앞의 세 장이 검색 결과에 보이므로 별명 · 이유 · 자세한 풀이를 앞에 둔다.
- 피그마 스토어 섹션(1290×2796, 11-23 초안이 본 순서: 브랜드 → 별명 공개 → 홈 → 오늘의 하늘 → 나 → 시기 → 내 하늘 지도 → 공유)이 있으면 그 틀을 쓰고, 화면은 운영 빌드(빌드 14 이후)의 것으로 바꾼다. 1290×2796 도 6.9" 칸에 그대로 올라간다.

## 6. 제출 전 점검(develop 7a8d3b5 기준)

| 항목 | 결과 | 증거 |
|---|---|---|
| 앱 안 계정 삭제(5.1.1(v)) | ✅ | 마이 › 내 정보(`src/app/my/index.tsx:57` → `/my/account`) › 맨 아래 "계정 삭제"(`src/app/my/account.tsx:114` → `/my/delete`) › `DELETE /account`(`src/lib/api.ts:1583`). 서버는 애플 refresh token 을 `/auth/revoke` 로 회수(`byeolmyeong-api` `auth/AppleSignIn.kt:58 · 118`) |
| Sign in with Apple(4.8) | ✅ | `app.json` `ios.usesAppleSignIn: true` · 플러그인 `expo-apple-authentication` · 로그인 화면 `src/app/login.tsx:129` `AppleLoginButton`. 카카오 · 구글과 같은 화면에 있다(결정 034) |
| 만 14세 확인 | ✅ | 가입 3단계에서 서버가 판정(`UNDER_AGE`, `src/app/signup/birth.tsx:101`, 문구 `strings.ts:37`). 출생 정보 바꾸기도 같은 판정(`strings.ts:458`). 앱의 값으로 판정하지 않는다(golden-rules) |
| 앱 안 처리방침 · 약관 | ✅ | 마이 › 이용약관 · 개인정보 처리방침(`src/app/my/index.tsx:67 · 68`) → `/settings/terms` · `/settings/privacy` 가 `src/content/legal.ts`(시행일 2026년 11월 20일, 랜딩과 같은 원본, 결정 043)를 그린다. 랜딩 `/privacy` · `/terms` 도 200 |
| 결제 · 광고 없음(3.1.1 해당 없음) | ✅ | `package.json` 에 인앱결제(RevenueCat · StoreKit) · 광고(AdMob 등) 패키지가 없다. 자세한 풀이도 1.0.0 은 무료(결정 050) |
| 권한 사용 목적 문구 | ✅ | `app.json`: 사진 추가 "공유 카드를 사진 앱에 저장하려고 해요." · 사진 읽기 "별명은 사진을 읽지 않아요. 공유 카드를 사진 앱에 저장할 때만 써요." · 마이크(expo-audio) "별명은 녹음하지 않아요. 음악을 틀 때 쓰는 소리 기능에 붙은 설정이에요." 푸시는 iOS 목적 문구가 필요 없고, 우리 시트 뒤에만 시스템 창(결정 066). 위치 · 카메라 · 연락처 문구 없음 |
| 암호화 수출 규정 | ✅ | `app.json` `ios.config.usesNonExemptEncryption: false` → 빌드의 `ITSAppUsesNonExemptEncryption = NO`. HTTPS 와 OS 암호화만 쓴다. 업로드 뒤 수출 규정 질문이 뜨지 않는다 |
| 추적 · ATT | ✅ | 광고 id · idfv · IP 수집 끔(결정 040 의 5, 93 줄 `src/lib/analytics/core.ts` `trackingOptions`) → ATT 창 없음 |
| 지원 URL | ✅ 결정 · ⚠ 반영 대기 | `https://byeolmyeong.com/` + 랜딩 바닥글 연락처 한 줄(소유자 2026-11-26). 운영에 올라간 뒤 입력 |
| 처리방침의 위탁 표 | ✅ 승인 · ⚠ 반영 대기 | 앰플리튜드 · Expo 위탁, 보관 1년, 바로 시행(소유자 승인 2026-11-26). 93 줄이 앱 #125 · 랜딩을 마무리 |
| 연령 등급 | ✅ | 16+(소유자 2026-11-26, 2 참고) |
| 앱 이름 | ⚠ | 앱을 만들 때 확인. 대안 셋 준비 |
| 운영 빌드에 개발용 값이 없다 | ⚠ 확인 | EAS `production` 환경 변수에 `EXPO_PUBLIC_USE_FIXTURES` · `EXPO_PUBLIC_DEV_SESSION` 이 없어야 한다(`.env.example` 머리말) |

## 7. 운영 iOS 첫 빌드 체크리스트

출시 순서(소유자 2026-11-26): 서버 main → 앱 main → 운영 iOS 첫 빌드 → App Store 심사 → 안드로이드. 관문마다 그날 소유자가 승인한다.

1. 서버 main 이 앱이 부르는 계약을 갖고 있는지 본다(`/me-report` · `/timing-report` · `/auth/analytics-id` 등). 앱 main 보다 서버 main 이 먼저다.
2. App Store Connect 에서 앱을 만든다. 번들 ID `com.byeolmyeong.app`, 이름 "별명"(안 되면 1 의 대안), 기본 언어 한국어, SKU 는 아무 고유 값(예: `byeolmyeong-ios`).
3. 만든 앱의 Apple ID(숫자)를 `eas.json` 의 `submit.production.ios.ascAppId` 에 넣는다. 지금은 비어 있어 `--auto-submit` 이 멈춘다. 빌드를 돌릴 워크트리(`.wt-app-eas`)에도 이 값이 있어야 한다.
4. EAS `production` 환경 변수를 확인한다. `EXPO_PUBLIC_API_URL`(운영 `https://api.byeolmyeong.com`), 구글 iOS 클라이언트 ID, 카카오 네이티브 앱 키, Meta 앱 ID(스토리 공유), `EXPO_PUBLIC_AMPLITUDE_API_KEY`(운영에만, 결정 081). 개발용 두 값은 없어야 한다.
5. 푸시: EAS 자격 증명에 APNs 키(74LB3QSH49)가 운영 번들에 연결돼 있는지 본다.
6. 소유자가 Mac 터미널에서 `.wt-app-eas` 로 가서 돌린다.
   ```
   npx eas-cli build --profile production --platform ios --auto-submit
   ```
   빌드 번호는 EAS 가 올린다(`appVersionSource: remote`, `autoIncrement`). 버전은 1.0.0.
7. 업로드가 끝나면 TestFlight 내부 테스트로 운영 빌드를 한 번 열어 본다. Sign in with Apple 가입 → 별명 → 자세한 풀이 → 공유 이미지 저장 → 알림 받기 → 계정 삭제까지.
8. App Store Connect 에 1~5 의 글 · 답 · 스크린숏을 넣고, 빌드를 고른다. 심사 연락처를 적는다.
9. "Add for Review" 뒤 "Submit for Review" 를 눌러야 실제로 접수된다.
10. 심사를 통과해 앱 주소가 생기면 관리 화면에 스토어 주소와 최소 버전을 넣는다(결정 027 · 059).

## 근거로 읽은 것
- 앱: `docs/release-1.0.0.md` · `docs/decisions/`(006 · 009 · 012 · 020 · 027 · 032 · 034 · 039 · 040 · 042 · 043 · 044 · 048~058 · 064 · 066 · 069 · 081 · 083 · 084) · `app.json` · `app.config.ts` · `eas.json` · `package.json` · `src/content/strings.ts` · `src/content/legal.ts`
- 서버: `byeolmyeong-api` develop `auth/AppleSignIn.kt` · `push/ExpoPush.kt` · `admin/AdminUsers.kt`
- 랜딩: 운영 `https://byeolmyeong.com/` · `/privacy` · `/terms`(2026-11-26 curl)
- 애플: [연령 등급 설정](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/) · [연령 등급 값과 정의](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/) · [연령 등급 갱신 안내](https://developer.apple.com/news/?id=ks775ehf) · [스크린숏 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) · [버전 정보 칸](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/) · [심사에 필요한 정보](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review/) · [심사 제출](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app)

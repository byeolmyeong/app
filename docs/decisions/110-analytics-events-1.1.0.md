---
type: decision
tags: [1.1.0, 제품 분석, 앰플리튜드, 이벤트, 결제 전환, 궁합 퍼널, 링크 고리]
status: active
last_reviewed: 2026-11-28
superseded_by:
---
# 110. (1.1.0) 앰플리튜드 이벤트를 13개 더한다 — 결제 전환 · 궁합 퍼널 · 링크 고리 · 새 기능 쓰임

> 상태: 활성 · 결정일 2026-11-28(소유자 "엉 넘어가자" → 세션 안 → "엉 하자")
> - 결정 040 의 규칙(값 목록 속성만 · 보내지 않는 것 · `src/lib/analytics/events.ts` 가 단일 출처)과 081(앰플리튜드 운영 프로젝트 하나)은 그대로다. 이 결정은 이벤트 표에 더하는 것만 정한다.
> - 원본: docs/raw/2026-11-27-session-planning-1.1.0.md 181 ~ 182

## 결정
1. **결제**
   - `purchase_sheet_viewed` { from: `me_tab` · `timing_tab` }
   - `purchase_started` { from }
   - `purchase_completed` { from, launch_price: 참거짓 }
   - `purchase_cancelled` { from } · `purchase_failed` { from }
   - `purchase_restored` { result: `restored` · `none` · `failed` }
2. **궁합**
   - `synastry_started` { entry: `home_love` · `home_friend` · `tab_new` · `tab_empty` · `link` · `new_star` }
   - `synastry_created` { relation: `love` · `friend`, entry }
   - `synastry_deleted` { count: `one` · `many` }
3. **링크**: `my_link_shared` { method: `share_sheet` · `copy` · `story` }. 들어온 쪽은 지금 있는 `app_opened`(entry `invite`) → `signup_completed` → `synastry_created`(entry `link`)로 잇는다.
4. **새 기능**
   - `home_menu_tapped` { item: `nickname` · `personality` · `love` · `relationship` · `work` · `emotion` · `month` · `year` · `life` · `synastry_love` · `synastry_friend` }
   - `notice_viewed` { category: `notice` · `update` }
   - `push_opened` { kind: `synastry_seen` · `synastry_ready` · `notice` · `reading_done` · `inquiry_answered` · `marketing` }
   - `whats_new_action` { action: `close` · `go_synastry` }
   - `music_toggled` { track: `background` · `loading`, on: 참거짓 }
5. **고치는 것**: `share_started` · `shared_link_opened` 의 card 값에 `my_sky`(내 하늘 카드)를 더한다. `CARDS` 의 옛 `ranking` 은 쓰지 않는다.
6. **보지 않는 것**: 점수 · 상대 이름 · 상대 출생 정보 · 링크 코드 · 구매 영수증 · 가격 숫자(스토어 글자)는 보내지 않는다. 링크를 앱 없이 연 랜딩 페이지는 앰플리튜드가 없어 서버 기록(링크 열림 수)으로 센다.
7. **볼 화면(앰플리튜드)**: 결제 전환(시트 → 완료, from · launch_price 로 나눔) · 궁합 퍼널(시작 → 결과 → 공유) · 링크 고리(링크 보냄 → 링크로 앱 열림 → 가입 → 궁합 결과) · 리텐션(궁합을 만든 사람 / 안 만든 사람의 D7).

## 근거
- 1.1.0 의 성공은 "산 비율 · 궁합을 쓰는 비율 · 링크로 새 사람이 들어오는 비율"이다. 이 세 퍼널을 이벤트 표로 바로 만들 수 있게 한다.
- 값 목록만 받으므로 출생 정보 · 이름이 실려 갈 길이 없다(040 의 2 · 3).
- 월 무료 한도(200만 이벤트, 040) 안에서 넉넉하다.

## 결과 · 재검토 조건
- 구현은 계획 A⑧(앰플리튜드 이벤트)에서 `events.ts` 표를 먼저 고치고 화면에서 부른다. 처리방침의 분석 항목은 지금 글로 충분한지 약관 초안과 함께 본다.
- 출시 한 달 뒤 결제 전환 · 링크 고리 숫자로 101(가격) · 104(링크)를 다시 본다.

---
type: decision
tags: [백엔드, Spring Boot, PostgreSQL, 저장소 구조]
status: active
last_reviewed: 2026-11-10
superseded_by:
---
# 004. 백엔드는 Spring Boot 로 직접 만들고, 앱과 저장소를 따로 둔다

> 상태: 활성 · 결정일 2026-11-10

## 맥락
서버가 할 일은 해석 생성(OpenAI API 호출)과 저장, 공유 링크 조회, 나중에 구매 확인이다. 차트 계산은 기기 안에서 하므로(docs/decisions/003-chart-engine-astronomy-engine.md) 서버와 앱이 공유할 계산 코드는 없다. 만드는 사람은 한 명이고 주력이 Java·Spring 이다.

## 결정
백엔드는 Spring Boot + PostgreSQL 로 만든다. GitHub 조직 아래에 앱 저장소(Expo, 이 저장소)와 서버 저장소(Spring)를 따로 둔다. 서버 저장소는 AI 해석을 붙이는 시점에 만든다.

## 근거
- 혼자 만드는 서비스는 가장 손에 익은 도구가 가장 빠르다.
- 서버와 앱이 공유할 코드가 거의 없어 언어를 TypeScript 로 통일하는 이점이 작다.
- 빌드 도구(npm / Gradle)와 배포 주기가 달라 저장소를 나누면 각 저장소의 설정·CI 가 단순해진다.

## 대안
- Supabase — 서버 코드를 덜 쓰지만 해석 생성·구매 확인 로직을 서버 함수로 흩어 두게 된다. 처음 계획의 기본값이었고 사용자가 직접 만드는 서버로 바꿨다.
- NestJS — 앱과 타입을 공유할 수 있지만 공유할 것이 적고 주력 스택이 아니다.

## 결과·재검토 조건
- 서버 호스팅·DB 운영·인증을 직접 한다. 호스팅은 미정이다. [확인 필요]
- API 계약을 바꾸면 두 저장소에 각각 커밋해야 한다. 기획 문서(docs/product.md 등)는 앱 저장소에 있고 서버 저장소는 경로로 가리킨다.
- API 요청·응답 타입을 앱(TypeScript)과 서버(Java)에 따로 적는다. 어긋남이 반복되면 OpenAPI 명세에서 앱 타입을 생성하는 것을 다시 본다.
- Spring Boot·Java 버전과 빌드 도구는 서버를 만드는 태스크에서 확정해 이 문서에 적는다.

---
type: decision
tags: [Expo, React Native, 웹앱, 플랫폼]
status: active
last_reviewed: 2026-11-10
superseded_by:
---
# 001. Expo 단일 코드베이스로 웹·iOS·Android 를 만든다

> 상태: 활성 · 결정일 2026-11-10

## 맥락
공유 링크로 퍼지는 서비스라 설치 없이 열리는 웹이 필요하다. 동시에 결제는 인앱결제만 쓰기로 해서 스토어 앱이 반드시 있어야 한다(docs/decisions/002-iap-only-per-report.md). 만드는 사람은 한 명이다.

## 결정
Expo(React Native, Expo Router)로 웹·iOS·Android 를 한 코드베이스에서 만든다. 개발과 검증은 웹으로 먼저 하고, 결제를 붙이는 시점에 스토어 빌드를 한다.

## 근거
- 웹(공유·유입)과 앱(결제·심사)을 코드 하나로 충족한다.
- 인앱결제·푸시 같은 네이티브 기능을 래퍼 없이 쓴다.

## 대안
- Next.js 웹앱 + Capacitor 래핑 — 웹뷰 래퍼는 Apple 심사의 최소 기능 기준에서 반려될 위험이 있다.
- 웹앱만 — 인앱결제를 쓸 수 없다.
- 네이티브 앱만 — 공유 링크가 설치를 요구해 유입이 끊긴다.

## 결과·재검토 조건
- 웹은 검색 유입(SEO)에 Next.js 보다 불리하다. 검색 유입이 핵심 채널이 되면 공유 페이지만 따로 떼는 것을 다시 본다.
- Expo SDK 는 릴리스마다 API 가 바뀐다. 코드 작성 전 버전 문서를 확인한다(AGENTS.md).

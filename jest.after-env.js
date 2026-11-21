// 시험마다 이번 실행의 메모리 층(계정 보관 등 — 모듈 수준 값)을 비운다. 앱에서는 실행 하나에 한 벌이지만, 시험은 한 파일 안에서 여러 "실행" 을 흉내 낸다.
beforeEach(() => {
  require('@/lib/account-store').resetAccountStoreForTest();
});

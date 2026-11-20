import { clearSuspended, isSuspended, markSuspended, subscribeSuspended, suspensionRedirect } from '@/features/auth/suspension';

describe('suspensionRedirect — 이용 정지 문의 보낼 곳(결정 065 의 5)', () => {
  it.each([
    ['정지 · 홈', true, true, [], '/suspended'],
    ['정지 · 마이', true, true, ['my'], '/suspended'],
    ['정지 · 계정', true, true, ['my', 'account'], '/suspended'],
    ['정지 · 정지 화면', true, true, ['suspended'], null],
    ['정지 · 새 문의(정지 중에도 열림)', true, true, ['my', 'inquiries', 'new'], null],
    ['정지 · 문의 내역 · 답변(서버가 열어 둠)', true, true, ['my', 'inquiries', '[id]'], null],
    ['정지 · 공유 페이지(로그인 없이 열림)', true, true, ['s', '[shareId]'], null],
    ['정지 풀림 · 정지 화면 → 홈', true, false, ['suspended'], '/'],
    ['정지 아님 · 홈', true, false, [], null],
    ['로그인 전 · 정지 화면(로그인 가드가 보낸다)', false, false, ['suspended'], null],
    ['로그인 전 · 정지 표시가 남아 있어도 보내지 않는다', false, true, ['login'], null],
  ] as const)('%s', (_name, signedIn, suspended, segments, target) => {
    expect(suspensionRedirect(signedIn, suspended, [...segments])).toBe(target);
  });
});

describe('정지 표시', () => {
  afterEach(() => clearSuspended());

  it('켜고 끄면 듣는 쪽에 한 번씩 알린다(같은 값이면 알리지 않는다)', () => {
    const heard = jest.fn();
    const off = subscribeSuspended(heard);
    markSuspended();
    markSuspended();
    expect(isSuspended()).toBe(true);
    clearSuspended();
    clearSuspended();
    expect(isSuspended()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(2);
    off();
  });
});

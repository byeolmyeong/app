import { guardRedirect } from '@/features/auth/guard';

// 로그인 전 가드(결정 009 · 034). 첫 경로 조각과 세션 상태로 갈 곳을 정한다.
describe('guardRedirect', () => {
  it('공유 페이지와 로그인에서 돌아오는 화면은 언제나 그대로다', () => {
    for (const status of ['checking', 'signedOut', 'signingUp', 'signedIn'] as const) {
      expect(guardRedirect(status, 's')).toBeNull();
      expect(guardRedirect(status, 'auth')).toBeNull();
    }
  });

  it('확인 중에는 어디로도 보내지 않는다(화면은 가린다)', () => {
    expect(guardRedirect('checking', undefined)).toBeNull();
    expect(guardRedirect('checking', 'reading')).toBeNull();
  });

  it('로그인 전에는 로그인 화면 말고는 로그인 화면으로 보낸다', () => {
    expect(guardRedirect('signedOut', undefined)).toBe('/login');
    expect(guardRedirect('signedOut', 'reading')).toBe('/login');
    expect(guardRedirect('signedOut', 'signup')).toBe('/login');
    expect(guardRedirect('signedOut', 'login')).toBeNull();
  });

  it('가입 중에는 가입 화면으로 보낸다', () => {
    expect(guardRedirect('signingUp', 'login')).toBe('/signup');
    expect(guardRedirect('signingUp', undefined)).toBe('/signup');
    expect(guardRedirect('signingUp', 'signup')).toBeNull();
  });

  it('로그인 상태에서 로그인 화면을 열면 홈으로 보낸다. 가입 화면은 그 화면이 정한다', () => {
    expect(guardRedirect('signedIn', 'login')).toBe('/');
    expect(guardRedirect('signedIn', undefined)).toBeNull();
    expect(guardRedirect('signedIn', 'settings')).toBeNull();
    expect(guardRedirect('signedIn', 'signup')).toBeNull();
  });
});

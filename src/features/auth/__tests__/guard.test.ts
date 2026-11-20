import { guardCovers, guardRedirect } from '@/features/auth/guard';

// 로그인 전 가드(결정 009 · 034 · 042). 첫 경로 조각 · 세션 상태 · 소개를 봤는지로 갈 곳을 정한다.
describe('guardRedirect', () => {
  it('공유 페이지와 로그인에서 돌아오는 화면은 언제나 그대로다', () => {
    for (const status of ['checking', 'signedOut', 'signingUp', 'signedIn'] as const) {
      expect(guardRedirect(status, 's')).toBeNull();
      expect(guardRedirect(status, 'auth')).toBeNull();
      expect(guardRedirect(status, 's', false)).toBeNull();
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

  it('로그인 전 · 소개를 아직 안 봤으면 소개로 보낸다(로그인 화면에서도)', () => {
    expect(guardRedirect('signedOut', undefined, false)).toBe('/intro');
    expect(guardRedirect('signedOut', 'login', false)).toBe('/intro');
    expect(guardRedirect('signedOut', 'reading', false)).toBe('/intro');
    expect(guardRedirect('signedOut', 'intro', false)).toBeNull();
  });

  it('로그인 전 · 소개를 봤으면(로그아웃 · 탈퇴 · 세션 만료 뒤도 같다) 로그인 화면으로 보낸다', () => {
    expect(guardRedirect('signedOut', undefined, true)).toBe('/login');
    expect(guardRedirect('signedOut', 'reading', true)).toBe('/login');
    expect(guardRedirect('signedOut', 'login', true)).toBeNull();
  });

  it('소개 화면이 떠 있는 동안 본 것으로 기록돼도 그 화면에서 쫓아내지 않는다', () => {
    expect(guardRedirect('signedOut', 'intro', true)).toBeNull();
  });

  it('소개를 봤는지 읽는 중이면 보내지 않고 가린다', () => {
    expect(guardRedirect('signedOut', undefined, null)).toBeNull();
    expect(guardRedirect('signedOut', 'login', null)).toBeNull();
    expect(guardCovers('signedOut', undefined, null)).toBe(true);
    expect(guardCovers('signedOut', 'login', null)).toBe(true);
    expect(guardCovers('signedOut', 'intro', null)).toBe(false);
  });

  it('가입 중에는 가입 첫 단계(약관)로 보낸다. 가입 단계 화면은 그대로다', () => {
    expect(guardRedirect('signingUp', 'login')).toBe('/signup/terms');
    expect(guardRedirect('signingUp', undefined)).toBe('/signup/terms');
    expect(guardRedirect('signingUp', 'signup')).toBeNull();
  });

  it('가입 중에도 약관 단계의 "보기" 가 여는 이용약관 · 개인정보 수집 · 이용 동의 · 마케팅 수신 동의 약관과 처리방침은 열린다(다른 설정 화면은 아니다)', () => {
    expect(guardRedirect('signingUp', 'settings', true, 'terms')).toBeNull();
    expect(guardRedirect('signingUp', 'settings', true, 'privacy-consent')).toBeNull();
    expect(guardRedirect('signingUp', 'settings', true, 'privacy')).toBeNull();
    expect(guardRedirect('signingUp', 'settings', true, 'marketing')).toBeNull();
    expect(guardRedirect('signingUp', 'settings', true, 'faq')).toBe('/signup/terms');
    expect(guardRedirect('signingUp', 'settings')).toBe('/signup/terms');
    expect(guardRedirect('signedOut', 'settings', true, 'terms')).toBe('/login');
  });

  it('로그인 상태에서 로그인 화면을 열면 홈으로 보낸다. 가입 화면은 그 화면이 정한다', () => {
    expect(guardRedirect('signedIn', 'login')).toBe('/');
    expect(guardRedirect('signedIn', undefined)).toBeNull();
    expect(guardRedirect('signedIn', 'settings')).toBeNull();
    expect(guardRedirect('signedIn', 'signup')).toBeNull();
  });

  it('로그인한 사람은 소개를 봤는지와 상관없이 소개로 가지 않는다(열면 홈으로)', () => {
    for (const seen of [true, false, null]) {
      expect(guardRedirect('signedIn', undefined, seen)).toBeNull();
      expect(guardRedirect('signedIn', 'intro', seen)).toBe('/');
      expect(guardCovers('signedIn', undefined, seen)).toBe(false);
    }
  });
});

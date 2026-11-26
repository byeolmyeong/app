import { readToEndKindOf, reachedEnd, routeEvents } from '@/lib/analytics/routes';

describe('경로에서 나는 이벤트(결정 040 · 081)', () => {
  it('첫 화면이면 app_opened 와 screen_viewed — 공유 링크로 들어오면 entry 가 share 다', () => {
    expect(routeEvents('/', null)).toEqual([
      ['app_opened', { entry: 'direct' }],
      ['screen_viewed', { screen: '/' }],
    ]);
    expect(routeEvents('/s/abc123', null)).toEqual([
      ['app_opened', { entry: 'share' }],
      ['screen_viewed', { screen: '/s/[shareId]' }],
    ]);
  });

  it('화면이 바뀌면 screen_viewed 만, 같은 화면이면 아무것도 없다', () => {
    expect(routeEvents('/me', '/')).toEqual([['screen_viewed', { screen: '/me' }]]);
    expect(routeEvents('/me', '/me')).toEqual([]);
  });

  it('출생 정보 입력 화면에 들어오면 birth_input_started — 가입 · 바꾸기를 나눈다', () => {
    expect(routeEvents('/signup/birth', '/signup/nickname')).toContainEqual(['birth_input_started', { context: 'signup' }]);
    expect(routeEvents('/my/birth', '/my')).toContainEqual(['birth_input_started', { context: 'profile_edit' }]);
    expect(routeEvents('/birth', '/')).toContainEqual(['birth_input_started', { context: 'profile_edit' }]);
  });

  it('주소 속 식별자 · 인증 코드는 어떤 이벤트에도 실리지 않는다', () => {
    const all = JSON.stringify([routeEvents('/s/SECRETSHARE?x=1', null), routeEvents('/auth/kakao?code=SECRETCODE', '/login'), routeEvents('/my/inquiries/SECRETID', '/my')]);
    expect(all).not.toMatch(/SECRET/);
  });

  it('끝까지 읽음을 재는 화면과 종류', () => {
    expect(readToEndKindOf('/reading')).toBe('summary');
    expect(readToEndKindOf('/me')).toBe('me_report');
    expect(readToEndKindOf('/timing/period?id=abc')).toBe('timing_report');
    expect(readToEndKindOf('/today')).toBe('day_sky');
    expect(readToEndKindOf('/timing/day')).toBe('day_sky');
    expect(readToEndKindOf('/my')).toBeNull();
  });

  it('스크롤이 끝(아래 여백 안)에 닿았는가 — 내용이 화면보다 짧으면 닿지 않은 것으로 본다', () => {
    const at = (offset: number, content = 2000, view = 800) => reachedEnd({ contentOffset: { y: offset }, contentSize: { height: content }, layoutMeasurement: { height: view } });
    expect(at(0)).toBe(false);
    expect(at(1100)).toBe(true);
    expect(at(1200)).toBe(true);
    expect(at(0, 600)).toBe(false);
  });
});

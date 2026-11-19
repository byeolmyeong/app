import { appleWebAvailable, kakaoAuthorizeUrl, readKakaoReturn } from '@/features/auth/providers/web-redirect';

// 웹 로그인의 주소 만들기 · 돌아온 값 읽기(결정 034)
describe('카카오 웹: 인가 주소', () => {
  it('REST API 키 · 돌아올 주소 · 코드 응답 · openid · state 를 싣는다', () => {
    const url = new URL(kakaoAuthorizeUrl('rest-key', 'https://byeolmyeong.com/auth/kakao', 'st-1'));
    expect(url.origin + url.pathname).toBe('https://kauth.kakao.com/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'rest-key',
      redirect_uri: 'https://byeolmyeong.com/auth/kakao',
      response_type: 'code',
      scope: 'openid',
      state: 'st-1',
    });
  });
});

describe('카카오 웹: 돌아온 값', () => {
  it('보낸 state 와 같고 코드가 있으면 코드다', () => {
    expect(readKakaoReturn({ code: 'c1', state: 'st-1' }, 'st-1')).toEqual({ kind: 'code', code: 'c1' });
  });

  it('사용자가 동의를 취소하면(error) 취소다', () => {
    expect(readKakaoReturn({ error: 'access_denied', state: 'st-1' }, 'st-1')).toEqual({ kind: 'cancelled' });
  });

  it('state 가 다르거나 보낸 state 가 없거나 코드가 없으면 받지 않는다', () => {
    expect(readKakaoReturn({ code: 'c1', state: 'other' }, 'st-1')).toEqual({ kind: 'invalid' });
    expect(readKakaoReturn({ code: 'c1', state: 'st-1' }, null)).toEqual({ kind: 'invalid' });
    expect(readKakaoReturn({ state: 'st-1' }, 'st-1')).toEqual({ kind: 'invalid' });
    expect(readKakaoReturn({ code: ['c1', 'c2'], state: 'st-1' }, 'st-1')).toEqual({ kind: 'invalid' });
  });
});

describe('애플 웹: 쓸 수 있는가', () => {
  it('Services ID 가 있고 https 일 때만이다(애플은 localhost · http 를 받지 않는다)', () => {
    expect(appleWebAvailable('com.byeolmyeong.web', 'https:')).toBe(true);
    expect(appleWebAvailable('com.byeolmyeong.web', 'http:')).toBe(false);
    expect(appleWebAvailable(undefined, 'https:')).toBe(false);
    expect(appleWebAvailable(' ', 'https:')).toBe(false);
  });
});

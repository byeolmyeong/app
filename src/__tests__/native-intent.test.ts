import { redirectSystemPath } from '@/app/+native-intent';

// 카카오톡 로그인에서 돌아오는 주소는 카카오 SDK 가 받는 것이라 화면 주소가 아니다 — SDK 가 못 받고 라우터까지 와도
// "Unmatched Route" 를 띄우지 않고 화면을 옮기지 않는다(빌드 8). 그 밖의 주소는 그대로.
describe('+native-intent redirectSystemPath', () => {
  it.each([
    'kakao0123456789abcdef0123456789abcdef://oauth?code=secret-code',
    'kakaoabc://oauth',
    'byeolmyeong-test:///oauth?code=secret-code',
    'byeolmyeong://oauth?code=secret-code',
    '/oauth?code=secret-code',
    '/oauth',
  ])('%s → 옮기지 않는다(null)', (path) => {
    expect(redirectSystemPath({ path, initial: false })).toBeNull();
    expect(redirectSystemPath({ path, initial: true })).toBeNull();
  });

  it.each([
    'byeolmyeong:///s/abc123',
    'https://byeolmyeong.com/s/abc123',
    'byeolmyeong-test:///timing?tab=year',
    '/today',
    '/notifications',
    '/auth/kakao?code=web-code',
    'com.googleusercontent.apps.123-abc:/oauth2redirect?code=x',
    'byeolmyeong:///oauthx',
  ])('%s → 그대로', (path) => {
    expect(redirectSystemPath({ path, initial: false })).toBe(path);
  });
});

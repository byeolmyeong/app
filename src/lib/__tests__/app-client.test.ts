import { appClientOf } from '@/lib/app-client';

describe('앱의 플랫폼과 버전(결정 027)', () => {
  it('iOS · Android 에서는 플랫폼과 expo 설정의 버전을 준다', () => {
    expect(appClientOf('ios', '1.2.0')).toEqual({ platform: 'ios', version: '1.2.0' });
    expect(appClientOf('android', '1.0.0')).toEqual({ platform: 'android', version: '1.0.0' });
  });

  it('웹과 그 밖의 플랫폼은 null 이다(버전 헤더를 보내지 않고 막지도 않는다)', () => {
    expect(appClientOf('web', '1.2.0')).toBeNull();
    expect(appClientOf('macos', '1.2.0')).toBeNull();
  });

  it('버전을 읽지 못했으면 null 이다', () => {
    expect(appClientOf('ios', undefined)).toBeNull();
    expect(appClientOf('ios', '')).toBeNull();
    expect(appClientOf('android', 100)).toBeNull();
  });
});

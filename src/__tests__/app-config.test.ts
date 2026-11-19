import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from '../../app.json';
import makeConfig from '../../app.config';

// 결정 041: APP_VARIANT 하나로 테스트앱 / 운영앱 설정이 갈린다. 오타가 운영 번들 ID 로 새지 않는지 지킨다.

const ctx = { config: appJson.expo } as unknown as ConfigContext;

function configWith(variant: string | undefined): ExpoConfig {
  const saved = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  try {
    return makeConfig(ctx);
  } finally {
    if (saved === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = saved;
  }
}

const ids = (c: ExpoConfig) => [c.name, c.scheme, c.ios?.bundleIdentifier, c.android?.package];

describe('app.config APP_VARIANT', () => {
  it.each([undefined, '', 'production'])('%p 이면 운영앱 설정이다', (variant) => {
    expect(ids(configWith(variant))).toEqual(['별명', 'byeolmyeong', 'com.byeolmyeong.app', 'com.byeolmyeong.app']);
  });

  it('test 이면 테스트앱의 이름 · scheme · 번들 ID · 패키지다', () => {
    expect(ids(configWith('test'))).toEqual([
      '별명 테스트',
      'byeolmyeong-test',
      'com.byeolmyeong.app.test',
      'com.byeolmyeong.app.test',
    ]);
  });

  it('test 변형도 그 밖의 설정은 운영과 같다', () => {
    const prod = configWith(undefined);
    const test = configWith('test');
    const strip = (c: ExpoConfig) => ({
      ...c,
      name: undefined,
      scheme: undefined,
      ios: { ...c.ios, bundleIdentifier: undefined },
      android: { ...c.android, package: undefined },
    });
    expect(strip(test)).toEqual(strip(prod));
    expect(test.ios?.usesAppleSignIn).toBe(true);
  });

  it.each(['Test', 'tset', ' test', 'staging'])('%p 는 오타로 보고 멈춘다(받은 값을 알린다)', (variant) => {
    expect(() => configWith(variant)).toThrow(`"${variant}"`);
  });
});

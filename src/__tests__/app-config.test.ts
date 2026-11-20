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
    const c = configWith(variant);
    expect(ids(c)).toEqual(['별명', 'byeolmyeong', 'com.byeolmyeong.app', 'com.byeolmyeong.app']);
    expect(c.icon).toBe('./assets/images/icon.png');
  });

  it('test 이면 테스트앱의 이름 · scheme · 번들 ID · 패키지 · 아이콘이다', () => {
    const c = configWith('test');
    expect(c.icon).toBe('./assets/images/icon-test.png');
    // 파일이 없으면 모듈을 찾지 못해 던진다(경로 오타를 잡는다)
    expect(() => require('../../assets/images/icon-test.png')).not.toThrow();
    expect(ids(c)).toEqual([
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
      icon: undefined,
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

// 결정 053: 인스타그램 스토리의 앱 조회 목록(react-native-share 플러그인)은 Meta 앱 ID 가 있는 빌드에만 넣는다(#61 리뷰 제안 8)
describe('app.config EXPO_PUBLIC_META_APP_ID', () => {
  const withMetaId = (id: string | undefined) => {
    const saved = process.env.EXPO_PUBLIC_META_APP_ID;
    if (id === undefined) delete process.env.EXPO_PUBLIC_META_APP_ID;
    else process.env.EXPO_PUBLIC_META_APP_ID = id;
    try {
      return configWith(undefined);
    } finally {
      if (saved === undefined) delete process.env.EXPO_PUBLIC_META_APP_ID;
      else process.env.EXPO_PUBLIC_META_APP_ID = saved;
    }
  };
  const sharePlugin = (c: ExpoConfig) => (c.plugins ?? []).find((p) => (Array.isArray(p) ? p[0] : p) === 'react-native-share');

  it('있으면 instagram-stories(iOS) · com.instagram.android(안드로이드) 조회 목록을 넣는다', () => {
    expect(sharePlugin(withMetaId('1162644856216782'))).toEqual(['react-native-share', { ios: ['instagram-stories'], android: ['com.instagram.android'] }]);
  });

  it.each([undefined, '', '   '])('없거나 비었으면(%p) 넣지 않는다 — 그 빌드는 스토리 버튼이 없다', (id) => {
    expect(sharePlugin(withMetaId(id))).toBeUndefined();
  });

  it('사진 저장(expo-media-library)은 늘 있고 안드로이드 읽기 권한(READ_MEDIA_*)을 싣지 않는다', () => {
    const c = withMetaId(undefined);
    const media = (c.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-media-library') as [string, { granularPermissions: string[] }];
    expect(media[1].granularPermissions).toEqual([]);
    expect(c.android?.blockedPermissions).toEqual(['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.READ_MEDIA_VISUAL_USER_SELECTED']);
  });
});

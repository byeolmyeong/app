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

  // 소유자 빌드 15: 화면이 바뀔 때 모서리에 흰 바탕이 비쳤다 — 앱 뒤 바탕(root view)이 비어 흰색이었다(결정 094)
  it('앱 뒤 바탕(root view)은 화면 바탕과 같은 #0D0E12 — 운영 · 테스트앱 둘 다', () => {
    expect(configWith(undefined).backgroundColor).toBe('#0D0E12');
    expect(configWith('test').backgroundColor).toBe('#0D0E12');
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

  it('푸시 플러그인은 FCM 의 기본 채널을 앱이 만드는 default 로 둔다(결정 098)', () => {
    const push = (withMetaId(undefined).plugins ?? []).find((p) => (Array.isArray(p) ? p[0] : p) === 'expo-notifications');
    expect(push).toEqual(['expo-notifications', expect.objectContaining({ defaultChannel: 'default' })]);
  });
});

// iOS 카카오 로그인(빌드 8): SDK 58 은 주소 열기를 SceneDelegate 가 받는다 — 카카오 키가 있으면 카카오 플러그인 뒤에 우리 플러그인이 SceneDelegate 에 넣는다
describe('app.config EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY', () => {
  const withKakaoKey = (key: string | undefined) => {
    const saved = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
    if (key === undefined) delete process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
    else process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY = key;
    try {
      return configWith(undefined);
    } finally {
      if (saved === undefined) delete process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
      else process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY = saved;
    }
  };
  const names = (c: ExpoConfig) => (c.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));

  it('있으면 카카오 플러그인 바로 뒤에 SceneDelegate 플러그인을 넣는다', () => {
    const list = names(withKakaoKey('dummy'));
    const kakao = list.indexOf('@react-native-seoul/kakao-login');
    expect(kakao).toBeGreaterThanOrEqual(0);
    expect(list[kakao + 1]).toBe('./plugins/with-kakao-scene-delegate.js');
  });

  it('없으면 둘 다 넣지 않는다', () => {
    const list = names(withKakaoKey(undefined));
    expect(list).not.toContain('@react-native-seoul/kakao-login');
    expect(list).not.toContain('./plugins/with-kakao-scene-delegate.js');
  });
});

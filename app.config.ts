import type { ConfigContext, ExpoConfig } from 'expo/config';

// 정적 설정(app.json) 위에 소셜 로그인 공급자 값을 얹는다(결정 034).
// 값은 비밀이 아니고(앱에 들어간다) .env 의 EXPO_PUBLIC_* 에서 온다. 값이 없으면 그 공급자의 플러그인은 넣지 않는다
// (구글 플러그인은 값 없이 넣으면 설정 읽기부터 실패한다) — 그 빌드에서는 그 공급자로 로그인할 수 없다.
// APP_VARIANT=test 이면 테스트앱(스테이징 서버, TestFlight 전용)의 이름 · 번들 ID · scheme · 아이콘으로 바꾼다(결정 041).

const TEST_APP_ID = 'com.byeolmyeong.app.test';

/** iOS OAuth 클라이언트 ID(`123-abc.apps.googleusercontent.com`)를 구글 로그인의 iOS URL scheme 으로 뒤집는다. */
function googleIosUrlScheme(iosClientId: string): string {
  return iosClientId.split('.').reverse().join('.');
}

/** 없음 · 빈 값 · `production` 은 운영앱, `test` 는 테스트앱. 그 밖의 값은 오타로 보고 멈춘다 — 운영 번들 ID 로 잘못 올라가지 않게. */
function isTestVariant(): boolean {
  const variant = process.env.APP_VARIANT ?? '';
  if (variant === '' || variant === 'production') return false;
  if (variant === 'test') return true;
  throw new Error(`APP_VARIANT 는 비우거나 production · test 중 하나여야 한다(결정 041). 받은 값: "${variant}"`);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const testVariant = isTestVariant();
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY?.trim();
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? [])];
  if (googleIosClientId) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme(googleIosClientId) }]);
  }
  if (kakaoNativeAppKey) {
    plugins.push(['@react-native-seoul/kakao-login', { kakaoAppKey: kakaoNativeAppKey }]);
    // 카카오 안드로이드 SDK 는 카카오의 Maven 저장소에 있다(라이브러리 문서의 Expo 설정).
    plugins.push(['expo-build-properties', { android: { extraMavenRepos: ['https://devrepo.kakao.com/nexus/content/groups/public/'] } }]);
  }
  // 안드로이드 푸시는 FCM 설정 파일이 있어야 토큰을 받는다(결정 057). 파일은 저장소에 두지 않고 EAS 파일 환경 변수 GOOGLE_SERVICES_JSON 이
  // 빌드 때 경로를 준다(운영 · 테스트 두 패키지가 들어 있는 파일). 없으면 안드로이드 빌드는 푸시 없이 만들어진다.
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON?.trim();
  const android = googleServicesFile ? { ...config.android, googleServicesFile } : config.android;
  const app: ExpoConfig = { ...config, name: config.name ?? '별명', slug: config.slug ?? 'byeolmyeong', plugins, android };
  if (!testVariant) return app;
  return {
    ...app,
    name: '별명 테스트',
    scheme: 'byeolmyeong-test',
    // 노란 띠 + TEST(assets/brand/app-icon-test.svg). 홈 화면에서 운영앱과 구분한다
    icon: './assets/images/icon-test.png',
    ios: { ...app.ios, bundleIdentifier: TEST_APP_ID },
    android: { ...app.android, package: TEST_APP_ID },
  };
};

import type { ConfigContext, ExpoConfig } from 'expo/config';

// 정적 설정(app.json) 위에 소셜 로그인 공급자 값을 얹는다(결정 034).
// 값은 비밀이 아니고(앱에 들어간다) .env 의 EXPO_PUBLIC_* 에서 온다. 값이 없으면 그 공급자의 플러그인은 넣지 않는다
// (구글 플러그인은 값 없이 넣으면 설정 읽기부터 실패한다) — 그 빌드에서는 그 공급자로 로그인할 수 없다.

/** iOS OAuth 클라이언트 ID(`123-abc.apps.googleusercontent.com`)를 구글 로그인의 iOS URL scheme 으로 뒤집는다. */
function googleIosUrlScheme(iosClientId: string): string {
  return iosClientId.split('.').reverse().join('.');
}

export default ({ config }: ConfigContext): ExpoConfig => {
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
  return { ...config, name: config.name ?? '별명', slug: config.slug ?? 'byeolmyeong', plugins };
};

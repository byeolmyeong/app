import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { guardCovers, guardRedirect } from '@/features/auth/guard';
import { useSession } from '@/features/auth/use-session';
import { UpdateGate } from '@/features/update/update-gate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 앱이 켜질 때 세션을 시작한다(개발용 세션이 켜져 있을 때만 서버를 부른다).
  // 공유 페이지(/s/…)는 로그인 없이 열리는 화면이라 그 안에서는 시작하지 않는다(결정 025).
  const [first] = useSegments();
  const session = useSession(first !== 's');
  // 로그인 전 가드(결정 034): 로그인 · 가입 · 공유 페이지 말고는 로그인해야 들어온다. 보내는 동안과 확인 중에는 화면을 가린다.
  const target = guardRedirect(session.status, first);
  const covered = guardCovers(session.status, first);
  useEffect(() => {
    if (target) router.replace(target);
  }, [target]);
  // 한 가족 이름 아래 굵기별 파일을 올린다. 굵기는 fontWeight 로 고른다.
  const [loaded, error] = useFonts([
    {
      fontFamily: FontFamily,
      fontDefinitions: [
        { path: require('@/assets/fonts/Pretendard-Regular.otf'), weight: 400, style: 'normal' },
        { path: require('@/assets/fonts/Pretendard-Medium.otf'), weight: 500, style: 'normal' },
        { path: require('@/assets/fonts/Pretendard-SemiBold.otf'), weight: 600, style: 'normal' },
        { path: require('@/assets/fonts/Pretendard-Bold.otf'), weight: 700, style: 'normal' },
        { path: require('@/assets/fonts/Pretendard-ExtraBold.otf'), weight: 800, style: 'normal' },
      ],
    },
  ]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  // 최소 버전보다 낮은 앱은 화면들 대신 "업데이트가 필요해요" 만 본다(결정 027). 세션과 상관없다.
  return (
    <UpdateGate>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.paper } }} />
      {covered ? <View testID="guard-cover" style={styles.cover} /> : null}
    </UpdateGate>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: Colors.paper },
});

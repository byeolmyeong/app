import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors, FontFamily } from '@/constants/theme';
import { useSession } from '@/features/auth/use-session';
import { UpdateGate } from '@/features/update/update-gate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 앱이 켜질 때 세션을 시작한다(개발용 세션이 켜져 있을 때만 서버를 부른다).
  useSession();
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
    </UpdateGate>
  );
}

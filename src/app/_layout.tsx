import { GowunBatang_400Regular, GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors, FontFamily, MonoFamily, SerifFamily } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    {
      fontFamily: SerifFamily,
      fontDefinitions: [
        { path: GowunBatang_400Regular, weight: 400, style: 'normal' },
        { path: GowunBatang_700Bold, weight: 700, style: 'normal' },
      ],
    },
    {
      fontFamily: MonoFamily,
      fontDefinitions: [
        { path: IBMPlexMono_400Regular, weight: 400, style: 'normal' },
        { path: IBMPlexMono_500Medium, weight: 500, style: 'normal' },
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

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.paper } }} />;
}

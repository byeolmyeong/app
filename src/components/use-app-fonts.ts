import { useFonts } from 'expo-font';

import { FontFamily } from '@/constants/theme';

/**
 * 앱 글꼴: Pretendard 한 가족에 굵기별 파일을 올린다. 굵기는 400 · 500 · 600 셋만 쓴다(theme.ts FontWeight, 결정 033).
 * 앱(iOS · 안드로이드)은 기기에 실린 OTF 를 등록한다. 웹은 use-app-fonts.web.ts(공식 부분 글꼴 woff2).
 */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts([
    {
      fontFamily: FontFamily,
      fontDefinitions: [
        { path: require('@/assets/fonts/Pretendard-Regular.otf'), weight: 400, style: 'normal' },
        { path: require('@/assets/fonts/Pretendard-Medium.otf'), weight: 500, style: 'normal' },
        { path: require('@/assets/fonts/Pretendard-SemiBold.otf'), weight: 600, style: 'normal' },
      ],
    },
  ]);
}

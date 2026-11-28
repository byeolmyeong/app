import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MyLayout, SocialButtonStyle as B } from '@/constants/theme';
import { strings } from '@/content/strings';

const L = MyLayout.account;
const G = L.badgeGlyph;

/**
 * 마크가 있는 공급자의 바탕과 로고 — 표 하나라 "마크가 있다"(hasProviderMark)와 "마크를 그린다"(ProviderBadge)가 어긋나지 않는다(리뷰 #166).
 * 바탕 · 로고 색은 로그인 버튼과 같은 공급자 가이드 값이다. 로고 모양은 로그인 버튼(`features/auth/providers/social-button.tsx`)의 것과 같다 —
 * 기능끼리 import 하지 않아 이 파일에 둔다.
 */
export const PROVIDER_MARKS = {
  KAKAO: {
    background: B.kakao.background,
    logo: (
      <Svg width={G} height={G} viewBox="0 0 24 24">
        <Path
          fill={B.kakao.symbol}
          d="M12 3C6.477 3 2 6.463 2 10.735c0 2.733 1.833 5.13 4.6 6.502l-1.17 4.32c-.104.383.333.69.666.469l5.14-3.41c.25.015.503.023.764.023 5.523 0 10-3.463 10-7.735C22 6.463 17.523 3 12 3z"
        />
      </Svg>
    ),
  },
  APPLE: {
    background: B.apple.background,
    logo: (
      <Svg width={G} height={G} viewBox="0 -1 17 22">
        <Path
          fill={B.apple.logo}
          d="M14.2 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.8 0-3.4 1-4.3 2.6-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.8-1.1-2.9-4.2zM11.6 3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z"
        />
      </Svg>
    ),
  },
  GOOGLE: {
    background: B.apple.background,
    logo: (
      <Svg width={G} height={G} viewBox="0 0 48 48">
        <Path fill={B.google.logo.red} d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill={B.google.logo.blue} d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill={B.google.logo.yellow} d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill={B.google.logo.green} d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </Svg>
    ),
  },
} as const satisfies Record<string, { background: string; logo: ReactNode }>;

type MarkedProvider = keyof typeof PROVIDER_MARKS;

/** 마크가 있는 공급자 — 그 밖(개발용 등)은 줄에 이름 글자를 둔다(결정 103 의 1) */
export const hasProviderMark = (provider: string): provider is MarkedProvider => Object.hasOwn(PROVIDER_MARKS, provider);

/**
 * 연결된 계정 줄의 공급자 마크(결정 103 의 1, 시안 16-1): 지름 24 동그라미에 공급자 로고 — 글자 · 이메일 없이 이것만 보인다.
 * 화면 읽기는 공급자 이름(`strings.my.account.providers`). 마크가 없는 공급자(개발용 등)는 그리지 않는다.
 */
export function ProviderBadge({ provider }: { provider: string }) {
  if (!hasProviderMark(provider)) return null;
  const mark = PROVIDER_MARKS[provider];
  return (
    <View
      testID={`provider-badge-${provider}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={strings.my.account.providers[provider]}
      style={[styles.badge, { backgroundColor: mark.background }]}>
      {mark.logo}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { width: L.badge, height: L.badge, borderRadius: L.badge / 2, alignItems: 'center', justifyContent: 'center' },
});

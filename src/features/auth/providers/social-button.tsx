/**
 * 공급자 로그인 버튼 한 모양(결정 041). 카카오 · 애플 · 구글 가이드의 바탕 · 문구 · 로고를 그대로 쓰고, 셋을 같은 줄에 맞춘다:
 * 높이 48 · 모서리 12, 로고 칸 20×20 은 바깥 왼쪽 16 에 고정, 문구는 버튼 전체 폭의 가운데 16px · 500.
 * 애플만 HIG 의 "제목 = 높이의 43%" 에서 벗어난다(소유자가 16px 통일을 골랐다). 심사에서 지적받으면 애플 글자만 되돌린다.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { LineWidth, SocialButtonStyle as B } from '@/constants/theme';

export type SocialProvider = 'KAKAO' | 'APPLE' | 'GOOGLE';

export type SocialButtonProps = {
  provider: SocialProvider;
  /** 공급자 가이드의 문구(strings.login) */
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/** 카카오 공식 리소스의 말풍선 심볼 */
function KakaoSymbol() {
  return (
    <Svg width={B.logo} height={B.logo} viewBox="0 0 24 24">
      <Path
        fill={B.kakao.symbol}
        d="M12 3C6.477 3 2 6.463 2 10.735c0 2.733 1.833 5.13 4.6 6.502l-1.17 4.32c-.104.383.333.69.666.469l5.14-3.41c.25.015.503.023.764.023 5.523 0 10-3.463 10-7.735C22 6.463 17.523 3 12 3z"
      />
    </Svg>
  );
}

/** 애플 로고(17:20) */
function AppleLogo() {
  return (
    <Svg width={B.apple.logoWidth} height={B.logo} viewBox="0 0 17 20">
      <Path
        fill={B.apple.logo}
        d="M14.2 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2.1-.9-3.4-.9-1.8 0-3.4 1-4.3 2.6-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.8-1.1-2.9-4.2zM11.6 3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z"
      />
    </Svg>
  );
}

/** 구글 G 로고(원래 색) */
function GoogleLogo() {
  const c = B.google.logo;
  return (
    <Svg width={B.logo} height={B.logo} viewBox="0 0 48 48">
      <Path fill={c.red} d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill={c.blue} d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill={c.yellow} d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill={c.green} d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

const LOGOS = { KAKAO: KakaoSymbol, APPLE: AppleLogo, GOOGLE: GoogleLogo } as const;

export function SocialButton({ provider, label, onPress, disabled = false }: SocialButtonProps) {
  const Logo = LOGOS[provider];
  return (
    <Pressable
      testID={`social-button-${provider}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, styles[provider], disabled && styles.disabled]}>
      <View testID={`social-logo-${provider}`} style={[styles.logo, provider === 'GOOGLE' && styles.logoInBorder]}>
        <Logo />
      </View>
      <Text style={[styles.text, text[provider]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: B.height,
    borderRadius: B.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: B.logoInset + B.logo,
  },
  KAKAO: { backgroundColor: B.kakao.background },
  APPLE: { backgroundColor: B.apple.background },
  GOOGLE: { backgroundColor: B.google.background, borderWidth: LineWidth, borderColor: B.google.border },
  disabled: { opacity: B.disabledOpacity },
  logo: {
    position: 'absolute',
    left: B.logoInset,
    top: (B.height - B.logo) / 2,
    width: B.logo,
    height: B.logo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 테두리(1) 안쪽에서 재므로 한 칸 덜 들어가야 바깥 기준 16 · 가운데가 된다 */
  logoInBorder: { left: B.logoInset - LineWidth, top: (B.height - B.logo) / 2 - LineWidth },
  text: { ...B.text },
});

const text = StyleSheet.create({
  KAKAO: { color: B.kakao.text },
  APPLE: { color: B.apple.text, letterSpacing: B.apple.letterSpacing },
  GOOGLE: { color: B.google.text },
});

import { Platform, Text, type TextProps, type TextStyle } from 'react-native';

import { Colors, Typography, type ColorName, type TypographyName } from '@/constants/theme';

export type TxtProps = TextProps & {
  /** 글자 단계(theme.ts Typography) 중 하나 */
  variant?: TypographyName;
  color?: ColorName;
  /**
   * 한국어 낱말 중간에서 줄을 바꾸지 않는다(시안의 `word-break: keep-all`, 결정 044 — 약관 글 문단 · 별명 공개의 별명).
   * 웹은 CSS, iOS 는 `lineBreakStrategyIOS="hangul-word"`. 안드로이드는 그 설정이 없어 글자 단위로 바꾼다.
   */
  keepAll?: boolean;
};

/** 웹의 CSS `word-break`(react-native 의 글자 모양에는 없는 이름이라 웹에만 건넨다) */
const keepAllWeb = (Platform.OS === 'web' ? { wordBreak: 'keep-all' } : {}) as TextStyle;

/** 모든 글씨의 바탕 부품. 글자 단계와 색을 테마에서만 고른다. */
export function Txt({ variant = 'body', color = 'ink', keepAll = false, style, ...rest }: TxtProps) {
  return (
    <Text
      style={[Typography[variant], { color: Colors[color] }, keepAll && keepAllWeb, style]}
      lineBreakStrategyIOS={keepAll ? 'hangul-word' : undefined}
      {...rest}
    />
  );
}

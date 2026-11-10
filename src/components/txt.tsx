import { Text, type TextProps } from 'react-native';

import { Colors, Typography, type ColorName, type TypographyName } from '@/constants/theme';

export type TxtProps = TextProps & {
  /** 글자 단계 6개 중 하나 */
  variant?: TypographyName;
  color?: ColorName;
};

/** 모든 글씨의 바탕 부품. 글자 단계와 색을 테마에서만 고른다. */
export function Txt({ variant = 'body', color = 'ink', style, ...rest }: TxtProps) {
  return <Text style={[Typography[variant], { color: Colors[color] }, style]} {...rest} />;
}

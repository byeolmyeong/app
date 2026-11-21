import { Platform, type TextStyle } from 'react-native';

import { Typography, type TypographyName } from '@/constants/theme';

/**
 * 치는 칸(TextInput)의 글자 모양 — 글자 단계(theme `Typography`)에서 치는 칸에만 맞게 고친다(소유자 지적: iOS 테스트앱에서
 * 숫자 · 글자가 칸의 세로 가운데가 아니라 위나 아래로 치우쳐 보였다).
 * - iOS 한 줄: TextInput 에 lineHeight 를 주면 글자가 위아래로 밀린다 → 그 단계의 lineHeight 를 뺀다. 칸의 높이 · 세로 가운데는 감싼 칸이 맡는다.
 * - 안드로이드: 글꼴 위아래 여백을 빼고(`includeFontPadding: false`) 한 줄은 세로 가운데(`textAlignVertical: 'center'`).
 * - 여러 줄(문의 글 같은): 줄 간격(lineHeight)은 그대로 두고 위에서부터 적힌다(안드로이드 `textAlignVertical: 'top'`).
 * - 웹: 그 단계 그대로(lineHeight 가 줄 높이라 가운데에 온다).
 * 위아래 여백은 늘 0 이다. 다른 글자(`Txt`)는 그 단계 그대로 쓴다. 플랫폼은 부를 때 읽는다(렌더 중에 부른다).
 */
export function inputText(variant: TypographyName, { multiline = false }: { multiline?: boolean } = {}): TextStyle {
  const { lineHeight, ...rest } = Typography[variant];
  const base: TextStyle = { ...rest, paddingVertical: 0 };
  if (Platform.OS === 'android') return { ...base, lineHeight, includeFontPadding: false, textAlignVertical: multiline ? 'top' : 'center' };
  if (Platform.OS === 'ios' && !multiline) return base;
  return { ...base, lineHeight };
}

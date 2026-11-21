import { View, type DimensionValue } from 'react-native';

import { Colors, Typography, type TypographyName } from '@/constants/theme';

/**
 * 아직 모르는 값의 흐린 자리표(움직이지 않음) — 프로필 그림 · 이름처럼 곧 올 작은 칸을 같은 크기로 잡아 두어, 값이 와도 자리가 튀지 않게
 * (소유자 "프로필 그림이 늦게 뜸"). 뼈대(Skeleton)와 달리 빛이 오가지 않고 화면 읽기에서 숨긴다.
 */
export function PlaceholderCircle({ size, testID }: { size: number; testID?: string }) {
  return (
    <View
      testID={testID}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.fill }}
    />
  );
}

/** 그 글자 단계의 줄 높이만큼 칸을 잡고 가운데에 글자 크기만 한 흐린 막대 */
export function PlaceholderLine({ variant, width, testID }: { variant: TypographyName; width: DimensionValue; testID?: string }) {
  const { lineHeight, fontSize } = Typography[variant];
  return (
    <View testID={testID} aria-hidden importantForAccessibility="no-hide-descendants" style={{ height: lineHeight, justifyContent: 'center' }}>
      <View style={{ width, height: fontSize, borderRadius: fontSize / 2, backgroundColor: Colors.fill }} />
    </View>
  );
}

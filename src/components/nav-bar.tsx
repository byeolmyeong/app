import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Txt } from '@/components/txt';
import { FontWeight, ScreenPaddingX, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

export type NavBarProps = {
  title?: string;
  /** 있으면 왼쪽에 뒤로 가기 화살표를 그린다 */
  onBack?: () => void;
  /** 뒤로 가기 대신 왼쪽에 둘 것(홈의 차트 표식) */
  left?: ReactNode;
};

/** 화면 머리. 왼쪽 뒤로 가기(또는 차트 표식), 가운데 제목. */
export function NavBar({ title, onBack, left }: NavBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.common.backLabel}
            hitSlop={Spacing.sm}
            onPress={onBack}
            style={noOutline}
          >
            <Txt variant="body" color="gray">
              {strings.common.back}
            </Txt>
          </Pressable>
        ) : (
          left
        )}
      </View>
      {title ? (
        <Txt variant="table" style={styles.title}>
          {title}
        </Txt>
      ) : null}
      <View style={styles.side} />
    </View>
  );
}

// 웹 브라우저가 그리는 파란 포커스 테두리는 끈다(가득 찬 고르기 화면이 열리면 이 버튼이 포커스를 받는다).
const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as ViewStyle;

const styles = StyleSheet.create({
  bar: {
    height: Sizes.navHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ScreenPaddingX,
  },
  side: { width: Sizes.navSide, alignItems: 'flex-start' },
  title: { fontWeight: FontWeight.semibold },
});

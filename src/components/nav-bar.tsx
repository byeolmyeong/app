import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { ScreenPaddingX, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

export type NavBarProps = {
  title?: string;
  /** 있으면 왼쪽에 뒤로 가기 화살표를 그린다 */
  onBack?: () => void;
  /** 뒤로 가기 대신 왼쪽에 둘 것(홈의 도장) */
  left?: ReactNode;
};

/** 화면 머리. 왼쪽 뒤로 가기(또는 도장), 가운데 제목. */
export function NavBar({ title, onBack, left }: NavBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel={strings.common.backLabel} hitSlop={Spacing.sm} onPress={onBack}>
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

const styles = StyleSheet.create({
  bar: {
    height: Sizes.navHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ScreenPaddingX,
  },
  side: { width: Sizes.seal, alignItems: 'flex-start' },
  title: { fontWeight: '700' },
});

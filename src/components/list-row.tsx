import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Sizes, Spacing, type ColorName } from '@/constants/theme';

export type ListRowProps = {
  label: string;
  /** 오른쪽에 적는 값(버전, 주소). 없고 누를 수 있으면 화살표를 그린다 */
  value?: string;
  /** 있으면 누를 수 있는 줄이다 */
  onPress?: () => void;
  /** 이름의 색. 지우는 줄은 danger */
  color?: ColorName;
};

/** 목록의 한 줄(설정). 왼쪽 이름, 오른쪽 값이나 화살표, 아래 옅은 선. */
export function ListRow({ label, value, onPress, color = 'ink' }: ListRowProps) {
  const content = (
    <>
      <Txt variant="body" color={color} style={styles.label}>
        {label}
      </Txt>
      {value !== undefined ? (
        <Txt variant="table" color="gray">
          {value}
        </Txt>
      ) : onPress ? (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.row}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: Sizes.listRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.hair,
  },
  label: { fontWeight: '500' },
});

import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, Sizes, Spacing } from '@/constants/theme';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** 체크 표시와 글씨. 고르면 체크가 초록이 된다. */
export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}>
      <Svg width={Sizes.checkbox} height={Sizes.checkbox} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12.5L10 17L19 7.5"
          stroke={checked ? Colors.primary : Colors.muted}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Txt variant="table" color={checked ? 'ink' : 'gray'}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingVertical: Spacing.xxs },
});

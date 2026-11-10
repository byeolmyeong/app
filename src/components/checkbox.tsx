import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** 네모 칸과 글씨. 고르면 칸을 먹으로 채운다. */
export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}>
      <View style={[styles.box, checked && styles.checked]} />
      <Txt variant="table" color="gray">
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs },
  box: { width: Sizes.checkbox, height: Sizes.checkbox, borderWidth: LineWidth, borderColor: Colors.ink },
  checked: { backgroundColor: Colors.ink },
});

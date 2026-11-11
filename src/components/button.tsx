import { Pressable, StyleSheet } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Sizes, Spacing, type ColorName } from '@/constants/theme';
import { strings } from '@/content/strings';

export type ButtonVariant = 'primary' | 'line' | 'danger';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary 먹 바탕(한 화면에 하나) · line 선 · danger 오류·삭제 */
  variant?: ButtonVariant;
  disabled?: boolean;
};

const textColor: Record<ButtonVariant, ColorName> = { primary: 'paper', line: 'ink', danger: 'paper' };

/** 왼쪽 정렬 글씨와 오른쪽 화살표가 있는 버튼. */
export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, styles[variant], disabled && styles.disabled]}>
      <Txt variant="heading" color={textColor[variant]} style={styles.label}>
        {label}
      </Txt>
      <Txt variant="body" color={textColor[variant]}>
        {strings.common.arrow}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: Sizes.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius,
    borderWidth: LineWidth,
  },
  primary: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  line: { backgroundColor: 'transparent', borderColor: Colors.ink },
  danger: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  disabled: { opacity: 0.4 },
  label: { fontWeight: '700' },
});

import { Pressable, StyleSheet } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, Radius, Sizes, Spacing, type ColorName } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'line' | 'danger';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary 초록 바탕(한 화면에 하나) · line 옅은 회색 바탕의 보조 · danger 오류·삭제 */
  variant?: ButtonVariant;
  disabled?: boolean;
};

const textColor: Record<ButtonVariant, ColorName> = { primary: 'ink', line: 'ink', danger: 'paper' };

/** 높이 56, 모서리 12, 글씨가 가운데인 버튼. 누를 수 없을 때는 회색으로 바뀐다. */
export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, styles[variant], disabled && styles.disabled]}>
      <Txt variant="button" color={disabled ? 'muted' : textColor[variant]}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: Sizes.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius,
  },
  primary: { backgroundColor: Colors.primary },
  line: { backgroundColor: Colors.fill },
  danger: { backgroundColor: Colors.danger },
  disabled: { backgroundColor: Colors.hair },
});

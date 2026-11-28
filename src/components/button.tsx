import { Pressable, StyleSheet } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, Radius, Sizes, Spacing, type ColorName } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'line' | 'sheetLine' | 'danger';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /**
   * primary 주색(푸른 보라) 바탕(한 화면에 하나) · line 채운 면(fill) 바탕의 보조 · sheetLine 시트 위의 보조(시트 바탕 raised 위에서 보이게 hair — 공유 시트, 결정 103 의 3) ·
   * danger 되돌릴 수 없는 일(계정 삭제 — 결정 065 의 6)
   */
  variant?: ButtonVariant;
  disabled?: boolean;
};

const textColor: Record<ButtonVariant, ColorName> = { primary: 'ink', line: 'ink', sheetLine: 'ink', danger: 'dangerSoft' };

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
  sheetLine: { backgroundColor: Colors.hair },
  /** 붉은 바탕을 쓰지 않는다: 검은 바탕 + 붉은 글자(결정 065 의 6) */
  danger: { backgroundColor: Colors.fill },
  /** 누를 수 없을 때: 채운 면에 흐린 글씨(결정 042 시안) */
  disabled: { backgroundColor: Colors.fill },
});

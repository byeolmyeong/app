import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Radius, Sizes, Spacing, Typography } from '@/constants/theme';

export type FieldProps = {
  label: string;
  /** 라벨 줄 오른쪽에 둘 것(시각 칸의 "모름" 체크, 결정 042) */
  labelRight?: ReactNode;
  /** 입력칸 아래의 작은 도움말 */
  hint?: string;
  /** 있으면 도움말 대신 오류색(danger)으로 보여 준다 */
  error?: string;
  /** 입력칸. `FieldInput`(치는 칸)이나 `FieldSelect`(눌러서 고르는 칸)를 넣는다 */
  children: ReactNode;
};

/** 라벨(위, 오른쪽에 덧붙일 것) · 입력칸 · 도움말 또는 오류(아래). 결정 042 시안의 모양이다. */
export function Field({ label, labelRight, hint, error, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Txt variant="captionStrong" color="gray">
          {label}
        </Txt>
        {labelRight}
      </View>
      {typeof children === 'string' ? (
        <View style={styles.box}>
          <Txt variant="input" style={styles.value}>
            {children}
          </Txt>
        </View>
      ) : (
        children
      )}
      {error ? (
        <Txt variant="caption" color="danger">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" color="hint">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * 치는 입력칸. 떠 있는 면(raised) 에 옅은 테두리의 높이 52 칸이고, 포커스면 주색 테두리, 틀렸으면 오류 테두리(결정 042 시안).
 * 값은 medium, 자리 글자는 regular 다. `multiline` 이면 여러 줄 높이의 칸이 되고 글은 위에서부터 적힌다.
 * `trailing` 은 칸 안 오른쪽에 둔다(닉네임의 글자 수).
 */
export function FieldInput({
  invalid = false,
  multiline = false,
  trailing,
  boxTestID,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & { invalid?: boolean; trailing?: ReactNode; boxTestID?: string }) {
  const [focused, setFocused] = useState(false);
  const empty = !rest.value;
  return (
    <View
      testID={boxTestID}
      style={[styles.box, trailing ? styles.withTrailing : null, multiline && styles.area, focused && styles.focused, invalid && styles.invalid]}>
      <TextInput
        multiline={multiline}
        placeholderTextColor={Colors.hint}
        selectionColor={Colors.primary}
        cursorColor={Colors.primary}
        style={[styles.input, empty && styles.placeholder, trailing ? styles.inputFlex : null, multiline && styles.areaInput, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {trailing}
    </View>
  );
}

export type FieldSelectProps = {
  /** 고른 값. 없으면 placeholder 를 흐리게 보여 준다 */
  value?: string;
  placeholder: string;
  onPress: () => void;
  invalid?: boolean;
  disabled?: boolean;
  /** 고르는 시트나 화면이 열려 있는가. 열려 있으면 화살표가 위를 향한다 */
  open?: boolean;
  testID?: string;
};

/** 눌러서 고르는 입력칸. 모양은 `FieldInput` 과 같고 오른쪽에 아래 화살표가 있다(시트가 열려도 그대로 아래, 결정 042 시안). 누르면 하단 시트를 연다. */
export function FieldSelect({
  value,
  placeholder,
  onPress,
  invalid = false,
  disabled = false,
  open = false,
  testID,
}: FieldSelectProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded: open }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.box, styles.select, disabled && styles.off, open && styles.focused, invalid && styles.invalid]}
    >
      <Txt variant="input" color={disabled ? 'muted' : value ? 'ink' : 'hint'} style={value ? styles.value : undefined}>
        {value ?? placeholder}
      </Txt>
      <View testID="field-select-arrow">
        <Svg width={Sizes.icon} height={Sizes.icon} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 9l6 6 6-6"
            stroke={Colors.hint}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </Pressable>
  );
}

// 웹 브라우저가 그리는 파란 포커스 테두리는 끈다. 포커스는 칸의 주색 테두리로 보여 준다. 커서는 주색(시트의 숨긴 커서를 물려받지 않게)
const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none', caretColor: Colors.primary } : {}) as TextStyle;

const styles = StyleSheet.create({
  field: { gap: Spacing.xs },
  labelRow: { minHeight: Sizes.fieldLabelRow, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  box: {
    height: Sizes.inputHeight,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.raised,
    borderRadius: Radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
  },
  withTrailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  area: { height: Sizes.textArea, paddingVertical: Spacing.md },
  areaInput: { flex: 1, textAlignVertical: 'top' },
  focused: { borderColor: Colors.primary },
  invalid: { borderColor: Colors.danger },
  /** 고를 수 없게 흐려진 칸(시각 "모름") */
  off: { backgroundColor: Colors.fieldOff, borderColor: Colors.fill },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { ...Typography.input, fontWeight: FontWeight.medium, color: Colors.ink, padding: 0, minWidth: 0, ...noOutline },
  placeholder: { fontWeight: FontWeight.regular },
  inputFlex: { flex: 1 },
  value: { fontWeight: FontWeight.medium },
});

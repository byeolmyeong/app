import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Sizes, Spacing, Typography } from '@/constants/theme';

export type FieldProps = {
  label: string;
  /** 입력칸 아래의 작은 도움말 */
  hint?: string;
  /** 있으면 도움말 대신 오류색(danger)으로 보여 준다 */
  error?: string;
  /** 입력칸. `FieldInput`(치는 칸)이나 `FieldSelect`(눌러서 고르는 칸)를 넣는다 */
  children: ReactNode;
};

/** 라벨(위) · 입력칸 · 도움말 또는 오류(아래). */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Txt variant="table">{label}</Txt>
      {typeof children === 'string' ? (
        <View style={styles.box}>
          <Txt variant="body">{children}</Txt>
        </View>
      ) : (
        children
      )}
      {error ? (
        <Txt variant="label" color="danger">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="label" color="hint">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * 치는 입력칸. 회색으로 채운 높이 56 칸이고, 포커스면 주색 테두리, 틀렸으면 오류 테두리.
 * `multiline` 이면 여러 줄 높이의 칸이 되고 글은 위에서부터 적힌다.
 */
export function FieldInput({
  invalid = false,
  multiline = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & { invalid?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, multiline && styles.area, focused && styles.focused, invalid && styles.invalid]}>
      <TextInput
        multiline={multiline}
        placeholderTextColor={Colors.hint}
        style={[styles.input, multiline && styles.areaInput, style]}
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
    </View>
  );
}

/** 고르는 칸의 화살표가 도는 시간 */
const ARROW_TURN_MS = 200;

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

/** 눌러서 고르는 입력칸. 모양은 `FieldInput` 과 같고 오른쪽에 아래 화살표가 있다. 누르면 하단 시트를 연다. */
export function FieldSelect({
  value,
  placeholder,
  onPress,
  invalid = false,
  disabled = false,
  open = false,
  testID,
}: FieldSelectProps) {
  // 열리면 화살표가 반 바퀴 돌아 위를 향하고, 닫히면 되돌아온다.
  const [turn] = useState(() => new Animated.Value(open ? 1 : 0));
  useEffect(() => {
    Animated.timing(turn, {
      toValue: open ? 1 : 0,
      duration: ARROW_TURN_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [open, turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, expanded: open }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.box, styles.select, open && styles.focused, invalid && styles.invalid]}
    >
      <Txt variant="body" color={disabled ? 'muted' : value ? 'ink' : 'hint'} style={value ? styles.value : undefined}>
        {value ?? placeholder}
      </Txt>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 9l6 6 6-6"
            stroke={disabled ? Colors.muted : Colors.hint}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

// 웹 브라우저가 그리는 파란 포커스 테두리는 끈다. 포커스는 칸의 주색 테두리로 보여 준다.
const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

const styles = StyleSheet.create({
  field: { gap: Spacing.xs },
  box: {
    height: Sizes.inputHeight,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.fill,
    borderRadius: Radius,
    borderWidth: LineWidth,
    borderColor: 'transparent',
  },
  area: { height: Sizes.textArea, paddingVertical: Spacing.md },
  areaInput: { flex: 1, textAlignVertical: 'top' },
  focused: { borderColor: Colors.primary },
  invalid: { borderColor: Colors.danger },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { ...Typography.body, fontWeight: '500', color: Colors.ink, padding: 0, minWidth: 0, ...noOutline },
  value: { fontWeight: '500' },
});

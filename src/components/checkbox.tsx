import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, Sizes, Spacing } from '@/constants/theme';

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** 체크 표시와 글씨. 고르면 체크가 주색이 된다. */
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
  box: { alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Colors.primary },
  boxOff: { borderWidth: Sizes.checkBorder, borderColor: Colors.muted },
});

export type CheckBoxProps = {
  checked: boolean;
  /** Sizes.checkRound · checkSquare · checkSmall */
  size: number;
  /** 동그라미(모두 동의). 아니면 모서리 6 네모 */
  round?: boolean;
};

/**
 * 칸이 있는 체크 표시(결정 041 시안): 빈 칸은 흐린 테두리, 고르면 주색으로 채우고 흰 체크. 모양만 그린다 —
 * 누르는 줄(역할 · 이름 · 상태)은 쓰는 쪽이 정한다.
 */
export function CheckBox({ checked, size, round = false }: CheckBoxProps) {
  const mark = size - 6;
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: round ? size / 2 : Sizes.checkRadius },
        checked ? styles.boxOn : styles.boxOff,
      ]}>
      {checked ? (
        <Svg width={mark} height={mark} viewBox="0 0 24 24" fill="none">
          <Path d="M5 12.5L10 17L19 7.5" stroke={Colors.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

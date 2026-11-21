import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, MyLayout } from '@/constants/theme';

const L = MyLayout.list;

/**
 * 묶음 제목 없는 목록 카드(결정 056, 보드 16 · 16-1 · 16-2 · 16-11): 떠 있는 면에 옅은 테두리 · 모서리 16, 줄 사이에 옅은 선.
 * 줄은 `ListCardRow` 를 넣는다(조건으로 빠진 줄은 선도 같이 빠진다).
 */
export function ListCard({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.card}>
      {rows.map((row, i) => (
        <View key={i} style={i > 0 ? styles.divided : null}>
          {row}
        </View>
      ))}
    </View>
  );
}

export type ListCardRowProps = {
  label: string;
  /** 이름 아래 작은 설명 한두 줄(알림 설정의 스위치 줄, 보드 16-2) */
  description?: string;
  /** 오른쪽에 적는 값(받는 시간 · 닉네임 · 앱 버전) */
  value?: string;
  /** 값 대신 오른쪽에 둘 것(연결된 계정의 공급자 표시) */
  trailing?: ReactNode;
  /** 있으면 누를 수 있는 줄이고 오른쪽 끝에 화살표를 그린다 */
  onPress?: () => void;
  /** false 면 누를 수 있어도 화살표를 그리지 않는다(다른 화면으로 가지 않는 줄 — 계정의 로그아웃) */
  chevron?: boolean;
  /** 있으면 오른쪽 끝에 스위치를 두고, 줄 어디를 눌러도 켜고 끈다(화살표는 없다) */
  toggle?: { value: boolean; onChange: (next: boolean) => void };
  /** 누를 수 없는 줄(흐린 묶음 — 알림 설정 16-2-2). 키보드 · 화면 낭독기에도 누를 수 없다고 알린다. 흐리게 그리는 것은 부른 쪽 */
  disabled?: boolean;
};

/** 스위치(보드 16-2 · 16-11): 켜면 주색, 끄면 테두리 색 바탕에 흰 손잡이. 모양만 그린다 — 누르기는 줄이 받는다 */
function SwitchMark({ on }: { on: boolean }) {
  return (
    <View testID={on ? 'switch-on' : 'switch-off'} style={[styles.switch, on ? styles.switchOn : styles.switchOff]}>
      <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
    </View>
  );
}

/** 목록 카드의 한 줄: 왼쪽 이름(과 설명), 오른쪽 값 · 덧붙일 것 · 화살표 또는 스위치. 최소 높이 52 */
export function ListCardRow({ label, description, value, trailing, onPress, chevron = true, toggle, disabled = false }: ListCardRowProps) {
  const hasRight = value !== undefined || trailing !== undefined;
  const content = (
    <>
      {description !== undefined ? (
        <View style={styles.names}>
          <Txt variant="item" style={styles.labelText}>
            {label}
          </Txt>
          <Txt variant="caption" color="hint" keepAll>
            {description}
          </Txt>
        </View>
      ) : hasRight ? (
        // 오른쪽에 값이 있으면 이름은 늘 한 줄 · 줄지 않는다 — 값이 남은 폭 안에서 줄어든다(소유자 2026-11-21)
        <Txt variant="item" numberOfLines={1} style={styles.labelFixed}>
          {label}
        </Txt>
      ) : (
        <Txt variant="item" style={styles.label}>
          {label}
        </Txt>
      )}
      {hasRight ? (
        <View style={styles.right}>
          {value !== undefined ? (
            // 넘치면 가운데를 줄여 앞과 끝(이메일의 도메인 등)이 보이게. 화면 읽기는 전체를 읽는다
            <Txt variant="desc" color="gray" numberOfLines={1} ellipsizeMode="middle" accessibilityLabel={value} style={styles.valueText}>
              {value}
            </Txt>
          ) : null}
          {trailing}
        </View>
      ) : null}
      {toggle ? (
        <SwitchMark on={toggle.value} />
      ) : onPress && chevron ? (
        <Svg width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </>
  );
  if (toggle)
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: toggle.value, disabled }}
        disabled={disabled}
        onPress={() => toggle.onChange(!toggle.value)}
        style={styles.row}>
        {content}
      </Pressable>
    );
  if (onPress)
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.row}>
        {content}
      </Pressable>
    );
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  divided: { borderTopWidth: LineWidth, borderTopColor: Colors.hair },
  row: {
    minHeight: L.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.gap,
    paddingVertical: L.paddingV,
    paddingHorizontal: L.paddingH,
  },
  label: { flex: 1, fontWeight: FontWeight.medium },
  labelFixed: { flexShrink: 0, fontWeight: FontWeight.medium },
  /** 오른쪽 값 · 덧붙일 것: 남은 폭을 차지하고 오른쪽에 붙는다(넘치면 안에서 줄어든다) */
  right: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  valueText: { flexShrink: 1 },
  /** 설명이 있으면 이름과 설명을 한 칸에 위아래로(사이 2) */
  names: { flex: 1, gap: L.descGap },
  labelText: { fontWeight: FontWeight.medium },
  switch: { width: L.switch.width, height: L.switch.height, borderRadius: L.switch.height / 2, justifyContent: 'center' },
  switchOn: { backgroundColor: Colors.primary },
  switchOff: { backgroundColor: Colors.hair },
  knob: { width: L.switch.knob, height: L.switch.knob, borderRadius: L.switch.knob / 2, backgroundColor: Colors.ink },
  knobOn: { alignSelf: 'flex-end', marginRight: L.switch.inset },
  knobOff: { alignSelf: 'flex-start', marginLeft: L.switch.inset },
});

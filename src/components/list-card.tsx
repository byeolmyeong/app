import { Children, createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, MyLayout } from '@/constants/theme';

const L = MyLayout.list;
const T = L.titled;

/** 줄이 묶음 제목이 있는 카드 안에 있는가 — 있으면 줄 모양이 달라진다(결정 093) */
const TitledCard = createContext(false);

/**
 * 목록 카드(결정 056, 보드 16 · 16-1 · 16-2 · 16-11): 떠 있는 면에 옅은 테두리 · 모서리 16, 줄 사이에 옅은 선.
 * 줄은 `ListCardRow` 를 넣는다(조건으로 빠진 줄은 선도 같이 빠진다).
 * `title` 이 있으면(마이 아래, 결정 093) 카드 안 맨 위에 묶음 제목(본문 굵게)을 두고, 줄은 본문 보통 · 높이 48 · 줄 사이 선 없이 그린다.
 */
export function ListCard({ title, children }: { title?: string; children: ReactNode }) {
  const rows = Children.toArray(children);
  const titled = title !== undefined;
  return (
    <View testID="list-card" style={[styles.card, titled && styles.cardTitled]}>
      {titled ? (
        <View style={styles.titleRow}>
          <Txt variant="bodyStrong" accessibilityRole="header">
            {title}
          </Txt>
        </View>
      ) : null}
      <TitledCard.Provider value={titled}>
        {rows.map((row, i) => (
          <View key={i} testID="list-card-item" style={i > 0 && !titled ? styles.divided : null}>
            {row}
          </View>
        ))}
      </TitledCard.Provider>
    </View>
  );
}

export type ListCardRowProps = {
  label: string;
  /** 오른쪽에 적는 값(받는 시간 · 앱 버전) */
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

/** 목록 카드의 한 줄: 왼쪽 이름, 오른쪽 값 · 덧붙일 것 · 화살표 또는 스위치. 최소 높이 52 */
export function ListCardRow({ label, value, trailing, onPress, chevron = true, toggle, disabled = false }: ListCardRowProps) {
  const titled = useContext(TitledCard);
  const hasRight = value !== undefined || trailing !== undefined;
  // 묶음 제목이 있는 카드의 줄은 본문 보통 굵기 · 높이 48(결정 093)
  const rowStyle = titled ? [styles.row, styles.rowTitled] : styles.row;
  const content = (
    <>
      {hasRight ? (
        // 오른쪽에 값이 있으면 이름은 늘 한 줄 · 줄지 않는다 — 값이 남은 폭 안에서 줄어든다(소유자 2026-11-21)
        <Txt variant="body" numberOfLines={1} style={[styles.labelFixed, titled && styles.labelRegular]}>
          {label}
        </Txt>
      ) : (
        <Txt variant="body" style={[styles.label, titled && styles.labelRegular]}>
          {label}
        </Txt>
      )}
      {hasRight ? (
        <View style={styles.right}>
          {value !== undefined ? (
            // 넘치면 가운데를 줄여 앞과 끝(이메일의 도메인 등)이 보이게. 화면 읽기는 전체를 읽는다
            <Txt variant="small" color="gray" numberOfLines={1} ellipsizeMode="middle" accessibilityLabel={value} style={styles.valueText}>
              {value}
            </Txt>
          ) : null}
          {trailing}
        </View>
      ) : null}
      {toggle ? (
        <SwitchMark on={toggle.value} />
      ) : onPress && chevron ? (
        <Svg testID="list-card-chevron" width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
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
        style={rowStyle}>
        {content}
      </Pressable>
    );
  if (onPress)
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={rowStyle}>
        {content}
      </Pressable>
    );
  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  cardTitled: { paddingVertical: T.padV },
  titleRow: { minHeight: T.title, justifyContent: 'center', paddingHorizontal: L.paddingH },
  divided: { borderTopWidth: LineWidth, borderTopColor: Colors.hair },
  row: {
    minHeight: L.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.gap,
    paddingVertical: L.paddingV,
    paddingHorizontal: L.paddingH,
  },
  rowTitled: { minHeight: T.row },
  label: { flex: 1, fontWeight: FontWeight.medium },
  labelFixed: { flexShrink: 0, fontWeight: FontWeight.medium },
  labelRegular: { fontWeight: FontWeight.regular },
  /** 오른쪽 값 · 덧붙일 것: 남은 폭을 차지하고 오른쪽에 붙는다(넘치면 안에서 줄어든다) */
  right: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  valueText: { flexShrink: 1 },
  switch: { width: L.switch.width, height: L.switch.height, borderRadius: L.switch.height / 2, justifyContent: 'center' },
  switchOn: { backgroundColor: Colors.primary },
  switchOff: { backgroundColor: Colors.hair },
  knob: { width: L.switch.knob, height: L.switch.knob, borderRadius: L.switch.knob / 2, backgroundColor: Colors.ink },
  knobOn: { alignSelf: 'flex-end', marginRight: L.switch.inset },
  knobOff: { alignSelf: 'flex-start', marginLeft: L.switch.inset },
});

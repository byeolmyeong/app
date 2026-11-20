import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, Radius, Spacing, TipLayout as T } from '@/constants/theme';
import { strings } from '@/content/strings';

export type InfoTipProps = {
  /** 물음표 왼쪽에 놓는 이름(글자 모양은 부르는 쪽이 정한다) */
  children: ReactNode;
  /** 닫혀 있을 때 물음표의 읽기 이름: "물병자리가 뭔가요?" */
  label: string;
  /** 말풍선의 굵은 첫 줄과 설명 */
  title: string;
  text: string;
  /** 열려 있는가. 한 번에 하나만 열리게 부르는 쪽이 정한다 */
  open: boolean;
  onToggle: () => void;
  testID?: string;
};

/**
 * 이름 옆의 작은 물음표(시안 13-2). 누르면 그 위에 말풍선이 뜨고, 다시 누르면 닫힌다.
 * 시트처럼 화면을 덮지 않아 읽던 자리를 잃지 않는다. 말풍선은 물음표 위 가운데에 두되 줄의 폭 밖으로 나가지 않게 민다.
 * 설명 시트가 필요한 긴 설명은 `InfoButton` 이다.
 */
export function InfoTip({ children, label, title, text, open, onToggle, testID }: InfoTipProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const [mark, setMark] = useState({ x: 0, width: 0 });
  const [bubbleWidth, setBubbleWidth] = useState(0);
  const center = mark.x + mark.width / 2;
  const left = Math.max(0, Math.min(center - bubbleWidth / 2, rowWidth - bubbleWidth));
  // 폭을 재기 전에는 보이지 않게 둔다(엉뚱한 자리에서 한 번 깜빡이지 않게)
  const measured = rowWidth > 0 && mark.width > 0 && bubbleWidth > 0;
  return (
    <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      {children}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={open ? strings.help.tipClose : label}
        accessibilityState={{ expanded: open }}
        hitSlop={Spacing.sm}
        onPress={onToggle}
        onLayout={(e) => setMark({ x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}
        style={[styles.mark, open && styles.markOn]}>
        <Txt variant="label" color={open ? 'ink' : 'gray'} style={styles.markText}>
          {strings.help.mark}
        </Txt>
      </Pressable>
      {open ? (
        <View
          testID={testID ? `${testID}-bubble` : undefined}
          pointerEvents="none"
          style={[styles.bubbleBox, { left, opacity: measured ? 1 : 0 }]}>
          <View style={styles.bubble} onLayout={(e) => setBubbleWidth(e.nativeEvent.layout.width)}>
            <Txt variant="note" style={styles.title}>
              {title}
            </Txt>
            <Txt variant="note" color="inkSoft">
              {text}
            </Txt>
          </View>
          <Svg width={T.arrow * 2} height={T.arrow} style={{ marginLeft: center - left - T.arrow }}>
            <Path d={`M0 0 L${T.arrow} ${T.arrow} L${T.arrow * 2} 0 Z`} fill={Colors.hair} />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: T.gap },
  mark: {
    width: T.button,
    height: T.button,
    borderRadius: T.button / 2,
    borderWidth: T.border,
    borderColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { borderColor: Colors.ink },
  markText: { fontWeight: FontWeight.semibold },
  // 줄 바로 위에 붙는다: 꼬리 끝이 물음표 위로 (offset - arrow) 떨어진다
  bubbleBox: { position: 'absolute', bottom: '100%', marginBottom: T.offset - T.arrow, alignItems: 'flex-start' },
  bubble: {
    maxWidth: T.maxWidth,
    paddingHorizontal: T.padX,
    paddingVertical: T.padY,
    borderRadius: Radius,
    backgroundColor: Colors.hair,
    gap: T.lineGap,
  },
  title: { fontWeight: FontWeight.semibold },
});

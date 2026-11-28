/**
 * 1.1.0 새로워진 점 창(결정 109 의 6, 시안 "홈 (1.1.0)" R3): 뒤를 어둡게 가리고 가운데에 "별명이 새로워졌어요" · 줄 셋 · 닫기(보조) / 궁합 보러 가기(주, 1 : 1.4).
 * 셋째 줄 "받았던 자세한 풀이는 그대로" 는 1.0.0 에서 받은 사람만(received, 결정 113 의 2). 바깥을 눌러도 닫히지 않고, 뒤로 가기(안드로이드)는 닫기와 같다.
 * 넓은 웹 화면에서도 앱 화면 폭 안에서만 가린다(가운데 창 `Dialog` 와 같다). 띄울지는 부르는 쪽(홈)이 정한다.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, DimColor, Radius, Sizes, WhatsNewLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';

const W = strings.whatsNew;

/** 줄마다의 그림(시안 R3 의 24 칸): 하트 · 네 칸 · 네 갈래 별 */
const GLYPHS = {
  synastry: <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  home: (
    <>
      <Rect x={4} y={4} width={7} height={7} rx={2} />
      <Rect x={13} y={4} width={7} height={7} rx={2} />
      <Rect x={4} y={13} width={7} height={7} rx={2} />
      <Rect x={13} y={13} width={7} height={7} rx={2} />
    </>
  ),
  reports: <Path d="M12 3.5Q13.4 10.6 20.5 12Q13.4 13.4 12 20.5Q10.6 13.4 3.5 12Q10.6 10.6 12 3.5Z" />,
} as const;

function Row({ kind }: { kind: keyof typeof GLYPHS }) {
  const item = W.items[kind];
  return (
    <View style={styles.row}>
      <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        <Svg
          width={L.glyph}
          height={L.glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke={Colors.accentText}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round">
          {GLYPHS[kind]}
        </Svg>
      </View>
      <View style={styles.rowText}>
        <Txt variant="bodyStrong">{item.title}</Txt>
        <Txt variant="caption" color="gray" keepAll>
          {item.body}
        </Txt>
      </View>
    </View>
  );
}

export function WhatsNewDialog({ received, onClose, onSynastry }: { received: boolean; onClose: () => void; onSynastry: () => void }) {
  return (
    <Modal testID="whats-new" visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.column}>
          <View testID="whats-new-card" accessibilityViewIsModal style={styles.card}>
            <Txt variant="section" accessibilityRole="header" style={styles.center}>
              {W.title}
            </Txt>
            <View style={styles.list}>
              <Row kind="synastry" />
              <Row kind="home" />
              {received ? <Row kind="reports" /> : null}
            </View>
            <View style={styles.actions}>
              <Pressable testID="whats-new-close" accessibilityRole="button" onPress={onClose} style={[styles.button, styles.close]}>
                <Txt variant="button">{W.close}</Txt>
              </Pressable>
              <Pressable testID="whats-new-synastry" accessibilityRole="button" onPress={onSynastry} style={[styles.button, styles.primary]}>
                <Txt variant="button">{W.synastry}</Txt>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: Sizes.maxContentWidth,
    justifyContent: 'center',
    paddingHorizontal: L.inset,
    backgroundColor: DimColor,
  },
  card: {
    paddingTop: L.padTop,
    paddingHorizontal: L.padX,
    paddingBottom: L.padBottom,
    borderRadius: L.radius,
    backgroundColor: Colors.fill,
  },
  center: { textAlign: 'center' },
  list: { marginTop: L.listTop, gap: L.rowGap },
  row: { flexDirection: 'row', alignItems: 'center', gap: L.iconGap },
  icon: { width: L.icon, height: L.icon, borderRadius: L.icon / 2, backgroundColor: L.iconFill, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: L.textGap },
  actions: { flexDirection: 'row', marginTop: L.actionsTop, gap: L.actionGap },
  button: { height: L.button, alignItems: 'center', justifyContent: 'center', borderRadius: Radius },
  close: { flex: 1, backgroundColor: Colors.hair },
  primary: { flex: L.primaryFlex, backgroundColor: Colors.primary },
});

import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, FontFamily, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { overlayLayout } from '@/features/chart/overlay-layout';
import type { SynastryOverlay } from '@/lib/api';

const S = strings.synastry.overlay;
const label = (map: Record<string, string>, key: string) => map[key] ?? key;
const LEGEND_DOT = 10;

export type OverlayWheelProps = {
  overlay: SynastryOverlay;
  /** 상대를 부를 이름. 그림 아래에 빈 점과 함께 적는다 */
  name: string;
};

/**
 * 겹친 휠(궁합). 서버가 준 `overlay` 만 그린다: 별자리 고리 · 눈금 · 내 점(고리 안쪽, 채운 점) · 상대 점(고리 바깥, 빈 점) ·
 * 두 사람 사이의 선(조화 실선, 긴장 점선). 두 사람은 색이 아니라 자리와 점의 모양으로 가른다.
 * 내 상승점을 받았으면 왼쪽 끝에 선으로 표시한다. 하우스는 그리지 않는다.
 */
export function OverlayWheel({ overlay, name }: OverlayWheelProps) {
  const w = overlayLayout(overlay);
  const text = { fontFamily: FontFamily, textAnchor: 'middle', alignmentBaseline: 'central' } as const;
  return (
    <View style={styles.root}>
      <View testID="overlay-wheel" style={styles.box} accessibilityRole="image" accessibilityLabel={S.wheelLabel}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${w.size} ${w.size}`}>
          <Circle cx={w.center} cy={w.center} r={w.rOuter} fill="none" stroke={Colors.ink} strokeWidth={1.2} />
          <Circle cx={w.center} cy={w.center} r={w.rSign} fill="none" stroke={Colors.ink} strokeWidth={1.2} />
          <Circle cx={w.center} cy={w.center} r={w.rInner} fill="none" stroke={Colors.hair} strokeWidth={1} />
          {w.ticks.map((t, i) => (
            <Line key={`t${i}`} {...t} stroke={Colors.ink} strokeWidth={0.7} />
          ))}
          {w.signs.map((s) => (
            <Line key={`sl${s.sign}`} {...s.line} stroke={Colors.ink} strokeWidth={1.2} />
          ))}
          {w.signs.map((s) => (
            <SvgText
              key={`st${s.sign}`}
              {...text}
              {...s.label}
              fontSize={w.signFontSize}
              fontWeight="600"
              fill={Colors.ink}
            >
              {label(strings.signs, s.sign)}
            </SvgText>
          ))}
          {w.ascLine ? <Line testID="overlay-asc-line" {...w.ascLine} stroke={Colors.ink} strokeWidth={1.2} /> : null}
          {w.lines.map(({ dashed, ...l }, i) => (
            <Line
              key={`a${i}`}
              testID="overlay-line"
              {...l}
              stroke={Colors.ink}
              strokeWidth={0.8}
              strokeDasharray={dashed ? '3.4 2.7' : undefined}
            />
          ))}
          {[...w.mine, ...w.theirs].map((b, i) =>
            b.leader ? (
              <Line key={`ld${i}`} testID="overlay-leader" {...b.leader} stroke={Colors.muted} strokeWidth={0.6} />
            ) : null,
          )}
          {w.mine.map((b) => (
            <Circle
              key={`m${b.body}`}
              testID="overlay-mine-dot"
              cx={b.dot.x}
              cy={b.dot.y}
              r={w.dotRadius}
              fill={Colors.ink}
              stroke={Colors.ink}
              strokeWidth={1}
            />
          ))}
          {w.theirs.map((b) => (
            <Circle
              key={`t${b.body}`}
              testID="overlay-theirs-dot"
              cx={b.dot.x}
              cy={b.dot.y}
              r={w.dotRadius}
              fill={Colors.paper}
              stroke={Colors.ink}
              strokeWidth={1}
            />
          ))}
          {w.mine.map((b) => (
            <SvgText
              key={`ml${b.body}`}
              {...text}
              {...b.label}
              fontSize={w.labelFontSize}
              fontWeight="700"
              fill={Colors.ink}
            >
              {label(strings.bodiesShort, b.body)}
            </SvgText>
          ))}
          {w.theirs.map((b) => (
            <SvgText
              key={`tl${b.body}`}
              {...text}
              {...b.label}
              fontSize={w.labelFontSize}
              fontWeight="500"
              fill={Colors.gray}
            >
              {label(strings.bodiesShort, b.body)}
            </SvgText>
          ))}
        </Svg>
      </View>
      {/* 어느 점이 누구인지: 채운 점은 나, 빈 점은 상대 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendMine]} />
          <Txt variant="label">{S.mine}</Txt>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDot} />
          <Txt variant="label">{name}</Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.sm },
  box: { width: '100%', maxWidth: Sizes.wheel, aspectRatio: 1, alignSelf: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  legendDot: {
    width: LEGEND_DOT,
    height: LEGEND_DOT,
    borderRadius: LEGEND_DOT / 2,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    backgroundColor: Colors.paper,
  },
  legendMine: { backgroundColor: Colors.ink },
});

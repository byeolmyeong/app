import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { Colors, FontFamily, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';
import { CONSTELLATIONS } from '@/features/chart/constellations';
import { wheelLayout } from '@/features/chart/wheel-layout';
import type { Chart } from '@/lib/api';

const label = (map: Record<string, string>, key: string) => map[key] ?? key;

export type ChartWheelProps = { chart: Chart };

/** (cx, cy) 를 가운데로 하는 다섯 꼭지 별의 꼭짓점. r 은 바깥 꼭지까지의 거리다. */
const starPoints = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const t = (Math.PI / 5) * i - Math.PI / 2;
    const d = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + d * Math.cos(t)).toFixed(2)},${(cy + d * Math.sin(t)).toFixed(2)}`;
  }).join(' ');

export type ChartPictureProps = {
  chart: Chart;
  /** 그림의 한 변 길이 */
  size: number;
  /** 별자리 이름을 별 모양 아래에 적는다. 작은 그림(홈 카드)에서는 끈다. */
  named?: boolean;
};

/**
 * 내 별자리(태양 자리)의 별 모양을 그린다(풀이 글 머리, 홈 카드). 보자마자 무슨 자리인지 알 수 있게
 * 별 모양의 별과 그 사이를 잇는 선만 그리고 그 아래에 이름을 적는다. 가장 밝은 별은 주색으로 크게 그린다.
 * 차트 전체는 차트 화면([ChartWheel])에 있다.
 */
export function ChartPicture({ chart, size, named = true }: ChartPictureProps) {
  const sunSign = chart.positions.find((p) => p.body === 'SUN')?.sign;
  const shape = sunSign ? CONSTELLATIONS[sunSign] : undefined;
  const signName = sunSign ? label(strings.signs, sunSign) + strings.chart.signSuffix : undefined;
  // 0~100 칸의 별 모양을 그림 안에 놓는다. 이름을 적을 때는 아래를 비운다.
  const scale = named ? 0.74 : 0.9;
  const left = (100 - 100 * scale) / 2;
  const top = named ? 3 : left;
  const px = (v: number) => left + v * scale;
  const py = (v: number) => top + v * scale;
  return (
    <View
      testID="chart-picture"
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={signName ?? strings.chart.wheelLabel}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        {shape?.lines.map(([a, b], i) => (
          <Line
            key={`l${i}`}
            testID="picture-star-line"
            x1={px(shape.stars[a].x)}
            y1={py(shape.stars[a].y)}
            x2={px(shape.stars[b].x)}
            y2={py(shape.stars[b].y)}
            stroke={Colors.muted}
            strokeWidth={0.7}
          />
        ))}
        {shape?.stars.map((star, i) => (
          <Polygon
            key={`s${i}`}
            testID="picture-star"
            points={starPoints(px(star.x), py(star.y), star.bright ? 5.2 : 3.2)}
            fill={star.bright ? Colors.primary : Colors.ink}
          />
        ))}
        {named && signName ? (
          <SvgText
            testID="picture-sign-name"
            fontFamily={FontFamily}
            textAnchor="middle"
            alignmentBaseline="central"
            x={50}
            y={91}
            fontSize={9}
            fontWeight="700"
            fill={Colors.ink}>
            {signName}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

/**
 * 출생 차트 휠. 서버가 준 `Chart` 만 그린다.
 * 별자리 고리 · 눈금 · 하우스 선과 번호 · 각도 선(조화 실선, 긴장 점선) · 천체 점과 이름.
 * 시각 "모름" 차트는 하우스 선과 번호 없이 그린다.
 */
export function ChartWheel({ chart }: ChartWheelProps) {
  const w = wheelLayout(chart);
  const text = { fontFamily: FontFamily, textAnchor: 'middle', alignmentBaseline: 'central' } as const;
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel={strings.chart.wheelLabel}>
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
          <SvgText key={`st${s.sign}`} {...text} {...s.label} fontSize={w.signFontSize} fontWeight="600" fill={Colors.ink}>
            {label(strings.signs, s.sign)}
          </SvgText>
        ))}
        {w.houseLines.map(({ main, ...l }, i) => (
          <Line
            key={`h${i}`}
            testID="wheel-house-line"
            {...l}
            stroke={main ? Colors.ink : Colors.hair}
            strokeWidth={main ? 1.2 : 0.9}
          />
        ))}
        {w.houseNumbers.map((h) => (
          <SvgText
            key={`hn${h.n}`}
            testID="wheel-house-number"
            {...text}
            x={h.x}
            y={h.y}
            fontSize={w.houseFontSize}
            fill={Colors.gray}>
            {h.n}
          </SvgText>
        ))}
        {w.aspectLines.map(({ dashed, ...l }, i) => (
          <Line
            key={`a${i}`}
            testID="wheel-aspect-line"
            {...l}
            stroke={Colors.ink}
            strokeWidth={0.8}
            strokeDasharray={dashed ? '3.4 2.7' : undefined}
          />
        ))}
        {w.bodies.map((b) => (
          <Circle
            key={`d${b.body}`}
            testID="wheel-body-dot"
            cx={b.dot.x}
            cy={b.dot.y}
            r={w.dotRadius}
            fill={Colors.ink}
            stroke={Colors.ink}
            strokeWidth={1}
          />
        ))}
        {w.bodies.map((b) => (
          <SvgText key={`l${b.body}`} {...text} {...b.label} fontSize={w.labelFontSize} fontWeight="700" fill={Colors.ink}>
            {label(strings.bodiesShort, b.body)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', maxWidth: Sizes.wheel, aspectRatio: 1, alignSelf: 'center' },
});

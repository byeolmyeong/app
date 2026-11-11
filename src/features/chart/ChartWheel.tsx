import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { Colors, FontFamily, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';
import { wheelLayout } from '@/features/chart/wheel-layout';
import type { Chart } from '@/lib/api';

const label = (map: Record<string, string>, key: string) => map[key] ?? key;

export type ChartWheelProps = { chart: Chart };

export type ChartPictureProps = {
  chart: Chart;
  /** 그림의 한 변 길이 */
  size: number;
  /** 별자리 이름을 기호 아래에 적는다. 작은 그림(홈 카드)에서는 끈다. */
  named?: boolean;
};

/**
 * 차트를 그림으로 보여 준다(풀이 글 머리, 홈 카드). 보자마자 내 별자리를 알 수 있게
 * 한가운데에 태양 자리의 모양(전갈·게 …)과 이름을 크게 두고, 고리에서 그 자리 칸만 주색으로 칠한다.
 * 둘레의 점은 천체의 자리라 사람마다 다르다. 태양은 주색으로 크게, 달은 조금 크게 그린다.
 * 읽는 법은 차트 화면([ChartWheel])에 있다.
 */
export function ChartPicture({ chart, size, named = true }: ChartPictureProps) {
  const w = wheelLayout(chart);
  const radius = (body: string) => w.dotRadius * (body === 'SUN' ? 2.6 : body === 'MOON' ? 1.9 : 1.3);
  const sunSign = chart.positions.find((p) => p.body === 'SUN')?.sign;
  const signName = sunSign ? label(strings.signs, sunSign) + strings.chart.signSuffix : undefined;
  const text = { fontFamily: FontFamily, textAnchor: 'middle', alignmentBaseline: 'central' } as const;
  return (
    <View
      testID="chart-picture"
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={signName ?? strings.chart.wheelLabel}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w.size} ${w.size}`}>
        {w.signs
          .filter((s) => s.sign === sunSign)
          .map((s) => (
            <Path key={`c${s.sign}`} testID="picture-sign-cell" d={s.cell} fill={Colors.primary} />
          ))}
        <Circle cx={w.center} cy={w.center} r={w.rOuter} fill="none" stroke={Colors.hair} strokeWidth={1.2} />
        <Circle cx={w.center} cy={w.center} r={w.rSign} fill="none" stroke={Colors.hair} strokeWidth={1.2} />
        {w.signs.map((s) => (
          <Line key={`sl${s.sign}`} {...s.line} stroke={Colors.hair} strokeWidth={1.2} />
        ))}
        {w.bodies.map((b) => (
          <Circle
            key={`d${b.body}`}
            testID="wheel-body-dot"
            cx={b.dot.x}
            cy={b.dot.y}
            r={radius(b.body)}
            fill={b.body === 'SUN' ? Colors.primary : Colors.ink}
          />
        ))}
        {sunSign ? (
          <SvgText
            testID="picture-sign-figure"
            {...text}
            x={w.center}
            y={w.center - (named ? w.size * 0.06 : 0)}
            fontSize={w.size * (named ? 0.3 : 0.38)}>
            {label(strings.signFigures, sunSign)}
          </SvgText>
        ) : null}
        {named && signName ? (
          <SvgText
            testID="picture-sign-name"
            {...text}
            x={w.center}
            y={w.center + w.size * 0.15}
            fontSize={w.size * 0.085}
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

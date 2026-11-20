import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';

import { Colors, FontFamily, FontWeight, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';
import { CONSTELLATIONS } from '@/features/chart/constellations';
import { wheelLayout } from '@/features/chart/wheel-layout';
import type { Chart } from '@/lib/api';

const label = (map: Record<string, string>, key: string) => map[key] ?? key;

export type ChartWheelProps = {
  chart: Chart;
  /** 고른 별: 천체 식별자 · 'ASC' · 'MC'. 없으면 null */
  selected: string | null;
};

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
            fontWeight={FontWeight.semibold}
            fill={Colors.ink}>
            {signName}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

/** 고른 별의 빛무리 · 고른 별이 있던 하우스 칸을 칠하는 주색의 진하기(시안 13) */
const HALO_OPACITY = 0.25;
const SECTOR_OPACITY = 0.16;

/**
 * 내 하늘 지도의 휠(시안 13). 서버가 준 `Chart` 만 그린다.
 * 별자리 고리 · 하우스 선과 번호 · 첫인상(상승점)과 꿈(중천)의 축 · 별 점과 짧은 이름. 각도 선은 긋지 않는다.
 * 고른 별(`selected`: 천체 · ASC · MC)은 주색으로 빛나고, 그 별이 있던 별자리 이름 · 하우스 번호가 밝아지며 그 하우스 칸이 칠해진다.
 * 시각 "모름" 차트는 하우스와 축 없이 그린다(golden-rules "프로젝트 규칙").
 */
export function ChartWheel({ chart, selected }: ChartWheelProps) {
  const w = wheelLayout(chart);
  const text = { fontFamily: FontFamily, textAnchor: 'middle', alignmentBaseline: 'central' } as const;
  const withHouses = w.axes.length > 0;
  // 고른 것이 있던 별자리 · 하우스(서버 값). 상승점은 1하우스, 중천은 10하우스가 시작되는 곳이다.
  const position = chart.positions.find((p) => p.body === selected);
  const angle = withHouses && chart.angles && (selected === 'ASC' || selected === 'MC') ? selected : null;
  const selectedSign = position?.sign ?? (angle && chart.angles ? chart.angles[angle === 'ASC' ? 'asc' : 'mc'].sign : undefined);
  const selectedHouse = withHouses ? (position?.house ?? (angle === 'ASC' ? 1 : angle === 'MC' ? 10 : undefined)) : undefined;
  const sector = w.houseSectors.find((h) => h.n === selectedHouse);
  const name = selected ? selectedName(selected) : undefined;
  const a11y = name ? `${strings.skyMap.wheelLabel}. ${strings.skyMap.selectedPrefix}${name}` : strings.skyMap.wheelLabel;
  return (
    <View style={styles.box} accessibilityRole="image" accessibilityLabel={a11y}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w.size} ${w.size}`}>
        <Circle cx={w.center} cy={w.center} r={w.rOuter} fill={Colors.fieldOff} stroke={Colors.hair} strokeWidth={1.2} />
        <Circle cx={w.center} cy={w.center} r={w.rSign} fill={Colors.paper} stroke={Colors.hair} strokeWidth={1} />
        <Circle cx={w.center} cy={w.center} r={w.rInner} fill={Colors.fieldOff} stroke={Colors.hair} strokeWidth={1} />
        {sector ? (
          <Path testID="wheel-house-sector" d={sector.path} fill={Colors.primary} fillOpacity={SECTOR_OPACITY} />
        ) : null}
        {w.signs.map((s) => (
          <Line key={`sl${s.sign}`} {...s.line} stroke={Colors.hair} strokeWidth={1} />
        ))}
        {w.houseLines.map((l, i) => (
          <Line key={`h${i}`} testID="wheel-house-line" {...l} stroke={Colors.hair} strokeWidth={1} />
        ))}
        {w.axes.map((a) => (
          <Line key={`ax${a.key}`} testID="wheel-axis" {...a.line} stroke={Colors.muted} strokeWidth={1.5} />
        ))}
        {w.signs.map((s) => {
          const on = s.sign === selectedSign;
          return (
            <SvgText
              key={`st${s.sign}`}
              testID={`wheel-sign-${s.sign}`}
              {...text}
              {...s.label}
              fontSize={w.signFontSize}
              fontWeight={on ? FontWeight.semibold : FontWeight.regular}
              fill={on ? Colors.accentText : Colors.hint}>
              {label(strings.signs, s.sign)}
            </SvgText>
          );
        })}
        {w.houseNumbers.map((h) => (
          <SvgText
            key={`hn${h.n}`}
            testID={`wheel-house-number-${h.n}`}
            {...text}
            x={h.x}
            y={h.y}
            fontSize={w.houseFontSize}
            fill={h.n === selectedHouse ? Colors.accentText : Colors.muted}>
            {h.n}
          </SvgText>
        ))}
        {w.axes.map((a) => (
          <SvgText
            key={`al${a.key}`}
            testID={`wheel-axis-label-${a.key}`}
            {...text}
            {...a.label}
            fontSize={w.axisFontSize}
            fontWeight={FontWeight.medium}
            fill={a.key === angle ? Colors.accentText : Colors.hint}>
            {strings.glossary.angles[a.key].short}
          </SvgText>
        ))}
        {w.bodies.map((b) =>
          b.body === selected ? (
            <G key={`d${b.body}`}>
              <Circle
                testID="wheel-selected-halo"
                cx={b.dot.x}
                cy={b.dot.y}
                r={w.haloRadius}
                fill={Colors.primary}
                fillOpacity={HALO_OPACITY}
              />
              <Circle testID="wheel-selected-dot" cx={b.dot.x} cy={b.dot.y} r={w.selectedDotRadius} fill={Colors.primary} />
            </G>
          ) : (
            <Circle key={`d${b.body}`} testID="wheel-body-dot" cx={b.dot.x} cy={b.dot.y} r={w.dotRadius} fill={Colors.ink} />
          ),
        )}
        {w.bodies.map((b) => {
          const on = b.body === selected;
          return (
            <SvgText
              key={`l${b.body}`}
              testID={`wheel-body-label-${b.body}`}
              {...text}
              {...b.label}
              fontSize={on ? w.selectedLabelFontSize : w.labelFontSize}
              fontWeight={on ? FontWeight.semibold : FontWeight.medium}
              fill={on ? Colors.ink : Colors.gray}>
              {label(strings.bodiesShort, b.body)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

/** 고른 것의 이름: 천체는 용어 사전의 이름, 상승점 · 중천은 별명 */
function selectedName(key: string): string | undefined {
  if (key === 'ASC' || key === 'MC') return strings.glossary.angles[key].nickname;
  return (strings.glossary.bodies as Record<string, { name: string } | undefined>)[key]?.name;
}

const styles = StyleSheet.create({
  box: { width: '100%', maxWidth: Sizes.skyWheel, aspectRatio: 1, alignSelf: 'center' },
});

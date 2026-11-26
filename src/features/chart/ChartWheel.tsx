import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import { BrandColors, Colors, FontFamily, FontWeight, ReasonLayout, Sizes, SkyMapLayout } from '@/constants/theme';
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

/** 별자리 그림(SignArt)의 칸: 시안 12-7 의 160×140. 별 모양(0~100)을 1.5 배로 키워 칸 가운데에 놓는다 */
const SIGN_VIEW = { w: 160, h: 140, scale: 1.5 } as const;
/** 네 갈래 별(-1~1 좌표) */
const FOUR_STAR = 'M0,-1 Q0.18,-0.18 1,0 Q0.18,0.18 0,1 Q-0.18,0.18 -1,0 Q-0.18,-0.18 0,-1Z';

/**
 * 공유 카드의 해 별자리 그림(결정 053 의 2, 보드 12-7): 별 모양의 선(흐린 색) · 별(흰 점) · 가장 밝은 별 자리의 빛무리와 네 갈래 별.
 * 서버가 준 해 별자리(`sunSign`)로 별 모양만 고른다(계산하지 않는다). 브랜드 자리의 장식이라 화면 읽기에서 숨긴다(이름은 카드의 칩이 말한다).
 */
export function SignArt({ sign, width, height }: { sign: string; width: number; height: number }) {
  const id = `sign${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const shape = CONSTELLATIONS[sign];
  if (!shape) return null;
  const xs = shape.stars.map((star) => star.x);
  const ys = shape.stars.map((star) => star.y);
  // 별 모양의 둘레 상자를 칸 가운데에 둔다
  const dx = SIGN_VIEW.w / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * SIGN_VIEW.scale;
  const dy = SIGN_VIEW.h / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2) * SIGN_VIEW.scale;
  const at = (star: { x: number; y: number }) => ({ x: dx + star.x * SIGN_VIEW.scale, y: dy + star.y * SIGN_VIEW.scale });
  const bright = shape.stars.find((star) => star.bright) ?? shape.stars[0];
  const glow = at(bright);
  return (
    <View testID={`share-art-sign-${sign}`} aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${SIGN_VIEW.w} ${SIGN_VIEW.h}`}>
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor={BrandColors.haloCenter} stopOpacity={0.6} />
            <Stop offset="1" stopColor={BrandColors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={glow.x} cy={glow.y} r={34} fill={`url(#${id})`} />
        {shape.lines.map(([a, b], i) => {
          const from = at(shape.stars[a]);
          const to = at(shape.stars[b]);
          return <Line key={`l${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={Colors.muted} strokeWidth={0.8} />;
        })}
        {shape.stars.map((star, i) => {
          if (star === bright) return null;
          const p = at(star);
          return <Circle key={`s${i}`} cx={p.x} cy={p.y} r={2.2} fill={Colors.ink} />;
        })}
        <Path transform={`translate(${glow.x} ${glow.y}) scale(9)`} d={FOUR_STAR} fill={BrandColors.core} />
      </Svg>
    </View>
  );
}

/**
 * 내 하늘 지도의 휠(시안 13). 서버가 준 `Chart` 만 그린다.
 * 별자리 고리 · 하우스 선과 번호 · 첫인상(상승점)과 꿈(중천)의 축 · 별 점과 짧은 이름. 각도 선은 긋지 않는다.
 * 고른 별(`selected`: 천체 · ASC · MC)은 주색으로 빛나고, 그 별이 있던 별자리 이름 · 하우스 번호가 밝아지며 그 하우스 칸이 칠해진다.
 * 시각 "모름" 차트는 하우스와 축 없이 그리고, 별자리 경계만 가운데 원까지 옅게 늘린다(결정 079 · golden-rules "프로젝트 규칙").
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
    <View testID="sky-wheel" style={styles.box} accessibilityRole="image" accessibilityLabel={a11y}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w.size} ${w.size}`}>
        <Circle cx={w.center} cy={w.center} r={w.rOuter} fill={Colors.fieldOff} stroke={Colors.hair} strokeWidth={1.2} />
        <Circle cx={w.center} cy={w.center} r={w.rSign} fill={Colors.paper} stroke={Colors.hair} strokeWidth={1} />
        <Circle cx={w.center} cy={w.center} r={w.rInner} fill={Colors.fieldOff} stroke={Colors.hair} strokeWidth={1} />
        {/* 시각 "모름": 별자리 경계만 가운데 원까지 옅게 — 별 점 · 이름 · 빛남 아래에(결정 079) */}
        {w.signInnerLines.map((l, i) => (
          <Line
            key={`si${i}`}
            testID="wheel-sign-inner-line"
            {...l}
            stroke={Colors.hair}
            strokeOpacity={SkyMapLayout.signInnerOpacity}
            strokeWidth={SkyMapLayout.signInnerWidth}
          />
        ))}
        {sector ? (
          <Path testID="wheel-house-sector" d={sector.path} fill={Colors.primary} fillOpacity={SkyMapLayout.sectorOpacity} />
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
                fillOpacity={SkyMapLayout.haloOpacity}
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

export type MiniWheelProps = {
  chart: Chart;
  /** 빛낼 별(천체 · ASC · MC) */
  bodies: string[];
  /** 칠할 하우스 칸 */
  houses: number[];
  /** 화면 읽기 이름 */
  label: string;
};

/**
 * 이유 펼침의 작은 지도(보드 12-1, 결정 054 의 4): 하늘 지도의 휠을 지름 120 으로 줄여 고리 · 하우스 선(시각을 알 때만)과
 * 그 근거의 별 · 칸만 그린다. 다른 별 · 글자는 그리지 않는다. 좌표는 하늘 지도와 같은 `wheelLayout`(서버의 황경 그대로)이다.
 * 시각 "모름" 차트는 하우스 선 · 칸 · 축 없이 별자리 칸의 경계만 긋는다(고리 안과, 가운데 원까지 옅게 — 결정 079 · golden-rules "프로젝트 규칙").
 */
export function MiniWheel({ chart, bodies, houses, label }: MiniWheelProps) {
  const L = ReasonLayout;
  const w = wheelLayout(chart, L.wheel);
  const withHouses = w.axes.length > 0;
  return (
    <View testID="reason-wheel" style={miniStyles.box} accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={L.wheel} height={L.wheel} viewBox={`0 0 ${L.wheel} ${L.wheel}`}>
        <Circle cx={w.center} cy={w.center} r={w.rOuter} fill="none" stroke={Colors.hair} strokeWidth={1.5} />
        <Circle cx={w.center} cy={w.center} r={w.rSign} fill="none" stroke={Colors.hair} strokeWidth={1} />
        <Circle cx={w.center} cy={w.center} r={w.rInner} fill="none" stroke={Colors.hair} strokeWidth={1} />
        {w.signInnerLines.map((l, i) => (
          <Line
            key={`msi${i}`}
            testID="mini-wheel-sign-inner-line"
            {...l}
            stroke={Colors.hair}
            strokeOpacity={SkyMapLayout.signInnerOpacity}
            strokeWidth={SkyMapLayout.signInnerWidth}
          />
        ))}
        {withHouses
          ? w.houseSectors
              .filter((h) => houses.includes(h.n))
              .map((h) => (
                <Path key={`ms${h.n}`} testID="mini-wheel-sector" d={h.path} fill={Colors.primary} fillOpacity={L.wheelSectorOpacity} />
              ))
          : null}
        {withHouses
          ? w.houseLines.map((l, i) => <Line key={`mh${i}`} testID="mini-wheel-house-line" {...l} stroke={Colors.hair} strokeWidth={1} />)
          : w.signs.map((sg) => <Line key={`msl${sg.sign}`} {...sg.line} stroke={Colors.hair} strokeWidth={1} />)}
        {w.axes
          .filter((a) => bodies.includes(a.key))
          .map((a) => (
            <Line key={`ma${a.key}`} testID="mini-wheel-axis" {...a.line} stroke={Colors.primary} strokeWidth={1.5} />
          ))}
        {w.bodies
          .filter((b) => bodies.includes(b.body))
          .map((b) => (
            <G key={`md${b.body}`}>
              <Circle
                cx={b.dot.x}
                cy={b.dot.y}
                r={L.wheelRing}
                fill="none"
                stroke={Colors.primary}
                strokeOpacity={L.wheelRingOpacity}
                strokeWidth={L.wheelRingWidth}
              />
              <Circle testID="mini-wheel-dot" cx={b.dot.x} cy={b.dot.y} r={L.wheelDot} fill={Colors.primary} />
            </G>
          ))}
      </Svg>
    </View>
  );
}

/**
 * 휠을 그리기 전의 자리(내 하늘 지도 — 밀기가 끝난 뒤 휠을 그린다, components/use-push-settled). 휠과 같은 상자에 휠의 뼈대 —
 * 바탕 고리 셋 · 별자리 12칸 경계 · (시각을 알면) 하우스 선 · (모르면) 안쪽까지 옅은 경계 — 를 휠과 같은 값으로 미리 그린다.
 * 휠이 들어와도 아래 목록이 움직이지 않고, 뼈대 위에 글자 · 별 점 · 고른 칸만 더해진다(소유자 빌드 14 "휠이 글보다 느리다" — 선만이라 가볍다).
 */
export function ChartWheelPlaceholder({ chart }: { chart: Chart }) {
  const w = wheelLayout(chart);
  return (
    <View testID="wheel-placeholder" style={styles.box} aria-hidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox={`0 0 ${w.size} ${w.size}`}>
        <Circle cx={w.center} cy={w.center} r={w.rOuter} fill={Colors.fieldOff} stroke={Colors.hair} strokeWidth={1.2} />
        <Circle cx={w.center} cy={w.center} r={w.rSign} fill={Colors.paper} stroke={Colors.hair} strokeWidth={1} />
        <Circle cx={w.center} cy={w.center} r={w.rInner} fill={Colors.fieldOff} stroke={Colors.hair} strokeWidth={1} />
        {w.signInnerLines.map((l, i) => (
          <Line key={`psi${i}`} {...l} stroke={Colors.hair} strokeOpacity={SkyMapLayout.signInnerOpacity} strokeWidth={SkyMapLayout.signInnerWidth} />
        ))}
        {w.signs.map((s) => (
          <Line key={`psl${s.sign}`} testID="wheel-placeholder-sign-line" {...s.line} stroke={Colors.hair} strokeWidth={1} />
        ))}
        {w.houseLines.map((l, i) => (
          <Line key={`ph${i}`} testID="wheel-placeholder-house-line" {...l} stroke={Colors.hair} strokeWidth={1} />
        ))}
      </Svg>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  box: { width: ReasonLayout.wheel, height: ReasonLayout.wheel, alignSelf: 'center', marginTop: ReasonLayout.wheelTop },
});

/** 고른 것의 이름: 천체는 용어 사전의 이름, 상승점 · 중천은 별명 */
function selectedName(key: string): string | undefined {
  if (key === 'ASC' || key === 'MC') return strings.glossary.angles[key].nickname;
  return (strings.glossary.bodies as Record<string, { name: string } | undefined>)[key]?.name;
}

const styles = StyleSheet.create({
  box: { width: '100%', maxWidth: Sizes.skyWheel, aspectRatio: 1, alignSelf: 'center' },
});

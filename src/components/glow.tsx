import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { BrandColors } from '@/constants/theme';

/**
 * 브랜드 그림의 밑그림(결정 035): 빛나는 모양(네 갈래 별 · 불꽃 · 하트 · 달)과 그 빛.
 * 빛은 방사형 빛무리를 먼저 깔고, 흐림(FeGaussianBlur)은 덧칠로만 쓴다. 흐림이 안 그려지는 기기에서도 모양과 빛무리는 남는다.
 */

const f = (n: number) => Math.round(n * 100) / 100;

/** 네 갈래 별. 변이 오목하고, k 가 클수록 통통하다 */
export const starPath = (R: number, k = 0.2) => {
  const c = f(R * k);
  return `M0,${-R} Q${c},${-c} ${R},0 Q${c},${c} 0,${R} Q${-c},${c} ${-R},0 Q${-c},${-c} 0,${-R}Z`;
};

const scaled = (d: string, s: number) => d.replace(/-?\d+(\.\d+)?/g, (n) => String(f(Number(n) * s)));
const HEART = 'M0,24 C-27,7 -30,-10 -17,-19 C-9,-24 -2,-20 0,-12 C2,-20 9,-24 17,-19 C30,-10 27,7 0,24Z';
const FLAME = 'M2,-30 C12,-16 22,-6 20,9 C18,22 9,28 0,28 C-10,28 -19,21 -19,8 C-19,-3 -11,-10 -7,-17 C-5,-9 -2,-5 3,-7 C7,-13 6,-21 2,-30Z';
const MOON_R = { outer: 25, inner: 19, x: 8, y: 24 };
const moonPath = (s: number) =>
  `M${f(MOON_R.x * s)},${f(-MOON_R.y * s)} A${f(MOON_R.outer * s)},${f(MOON_R.outer * s)} 0 1 0 ${f(MOON_R.x * s)},${f(MOON_R.y * s)} A${f(MOON_R.inner * s)},${f(MOON_R.inner * s)} 0 1 1 ${f(MOON_R.x * s)},${f(-MOON_R.y * s)}Z`;

export type GlowShapeName = 'star' | 'flame' | 'heart' | 'moon';

/** 좌표 -60~60 안의 모양 */
export const shapePath = (shape: GlowShapeName, s = 1) => {
  switch (shape) {
    case 'star':
      return starPath(f(26 * s), 0.2);
    case 'flame':
      return scaled(FLAME, 0.86 * s);
    case 'heart':
      return scaled(HEART, 0.9 * s);
    case 'moon':
      return moonPath(0.9 * s);
  }
};

/** 한 부품 안에서만 쓰는 이름(여러 개가 한 화면에 있어도 id 가 겹치지 않게) */
export function useSvgIds() {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  return {
    halo: `halo${base}`,
    haloDim: `halodim${base}`,
    blurXL: `bxl${base}`,
    blurL: `bl${base}`,
    blurM: `bm${base}`,
    blurS: `bs${base}`,
  };
}
export type SvgIds = ReturnType<typeof useSvgIds>;

/** 빛에 쓰는 정의: 빛무리 둘(밝은 · 흐린)과 흐림 넷. 흐림 정도는 그리는 좌표 기준이다 */
export function GlowDefs({ ids }: { ids: SvgIds }) {
  return (
    <Defs>
      <RadialGradient id={ids.halo}>
        <Stop offset="0" stopColor={BrandColors.glowMid} stopOpacity={0.55} />
        <Stop offset="0.45" stopColor={BrandColors.glow} stopOpacity={0.18} />
        <Stop offset="1" stopColor={BrandColors.glow} stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id={ids.haloDim}>
        <Stop offset="0" stopColor={BrandColors.dimGlow} stopOpacity={0.35} />
        <Stop offset="1" stopColor={BrandColors.dimGlow} stopOpacity={0} />
      </RadialGradient>
      <Filter id={ids.blurXL} x="-150%" y="-150%" width="400%" height="400%">
        <FeGaussianBlur stdDeviation={14} />
      </Filter>
      <Filter id={ids.blurL} x="-100%" y="-100%" width="300%" height="300%">
        <FeGaussianBlur stdDeviation={7} />
      </Filter>
      <Filter id={ids.blurM} x="-60%" y="-60%" width="220%" height="220%">
        <FeGaussianBlur stdDeviation={3} />
      </Filter>
      <Filter id={ids.blurS} x="-40%" y="-40%" width="180%" height="180%">
        <FeGaussianBlur stdDeviation={1.2} />
      </Filter>
    </Defs>
  );
}

/** 빛나는 모양 하나: 빛무리 → 푸른 번짐 → 옅은 보라 → 흰 심 */
export function GlowLayers({ d, ids, halo = 46, dim = false }: { d: string; ids: SvgIds; halo?: number; dim?: boolean }) {
  if (dim)
    return (
      <G>
        <Circle r={halo} fill={`url(#${ids.haloDim})`} />
        <Path d={d} fill={BrandColors.dimGlow} filter={`url(#${ids.blurL})`} />
        <Path d={d} fill={BrandColors.dim} transform="scale(0.86)" />
      </G>
    );
  return (
    <G>
      <Circle r={halo} fill={`url(#${ids.halo})`} />
      <Path d={d} fill={BrandColors.glow} opacity={0.9} filter={`url(#${ids.blurXL})`} />
      <Path d={d} fill={BrandColors.glowMid} filter={`url(#${ids.blurL})`} />
      <Path d={d} fill={BrandColors.glowSoft} filter={`url(#${ids.blurM})`} />
      <Path d={d} fill={BrandColors.core} transform="scale(0.86)" filter={`url(#${ids.blurS})`} />
    </G>
  );
}

/** 작은 반짝임(네 갈래 별) */
export function Sparkle({ x, y, r, ids, opacity = 1 }: { x: number; y: number; r: number; ids: SvgIds; opacity?: number }) {
  return (
    <G transform={`translate(${x} ${y})`} opacity={opacity}>
      <Path d={starPath(r, 0.16)} fill={BrandColors.glowSoft} filter={`url(#${ids.blurS})`} />
      <Path d={starPath(f(r * 0.7), 0.16)} fill={BrandColors.core} />
    </G>
  );
}

export type GlowShapeProps = { shape: GlowShapeName; size: number; dim?: boolean };

/** 빛나는 모양 하나를 정사각형으로 그린다(홈 아이콘). 장식이라 화면 읽기에서 숨긴다 */
export function GlowShape({ shape, size, dim = false }: GlowShapeProps) {
  const ids = useSvgIds();
  return (
    <View
      testID={`glow-${shape}`}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="-60 -60 120 120">
        <GlowDefs ids={ids} />
        <GlowLayers d={shapePath(shape)} ids={ids} dim={dim} />
      </Svg>
    </View>
  );
}

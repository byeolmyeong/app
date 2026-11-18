import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { GlowDefs, GlowLayers, starPath, useSvgIds } from '@/components/glow';
import { BrandColors, Colors } from '@/constants/theme';
import { strings } from '@/content/strings';

export type BrandMarkProps = { height: number };

/** 그리는 좌표: 별(0~100) · 명(100~200), 둘레 6 여백 */
const VIEW = { x: -6, y: -6, w: 212, h: 112 };
/** 이 높이 이하에서는 받침 고리를 주색 한 색으로 그린다(빛 · 유리는 작으면 뭉개진다) */
const SMALL = 24;

/**
 * 로고 "구슬 받침 레터링"(결정 035): "별명" 을 한 획 굵기의 둥근 선으로 그리고,
 * 명의 받침 ㅇ 을 별이 든 유리 구슬(무지갯빛 고리)로 바꿨다. 화면 읽기에서는 앱 이름으로 읽힌다.
 */
export function BrandMark({ height }: BrandMarkProps) {
  const small = height <= SMALL;
  const w = small ? 10 : 8;
  const width = Math.round((height * VIEW.w) / VIEW.h);
  const stroke = { stroke: Colors.ink, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <View testID="brand-mark" accessibilityRole="image" accessibilityLabel={strings.appName} style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}>
        {/* 별: ㅂ · ㅕ · ㄹ */}
        <G {...stroke}>
          <Path d="M12,10 V50 H44 V10 M12,30 H44" />
          <Path d="M80,6 V54 M60,21 H80 M60,39 H80" />
          <Path d="M16,64 H84 V79 H16 V94 H84" />
        </G>
        {/* 명: ㅁ · ㅕ · 받침 구슬 */}
        <G transform="translate(100 0)">
          <G {...stroke}>
            <Path d="M12,10 H44 V50 H12 Z" />
            <Path d="M80,6 V54 M60,21 H80 M60,39 H80" />
          </G>
          <G transform="translate(46 79)">{small ? <Circle r={14.5} fill="none" stroke={Colors.primary} strokeWidth={w} /> : <Orb w={w} />}</G>
        </G>
      </Svg>
    </View>
  );
}

/** 받침 ㅇ: 유리 구슬 + 무지갯빛 고리 + 안의 빛나는 별 */
function Orb({ w }: { w: number }) {
  const ids = useSvgIds();
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rim = `rim${base}`;
  const body = `glass${base}`;
  return (
    <G>
      <GlowDefs ids={ids} />
      <Defs>
        <LinearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BrandColors.rimLight} />
          <Stop offset="0.35" stopColor={Colors.primary} />
          <Stop offset="0.7" stopColor={BrandColors.glass} />
          <Stop offset="1" stopColor={BrandColors.rimViolet} />
        </LinearGradient>
        <RadialGradient id={body} cx="42%" cy="38%" r="75%">
          <Stop offset="0" stopColor={BrandColors.glassDeep} stopOpacity={0.55} />
          <Stop offset="0.6" stopColor={BrandColors.glassNight} stopOpacity={0.35} />
          <Stop offset="1" stopColor={Colors.primary} stopOpacity={0.35} />
        </RadialGradient>
      </Defs>
      <Circle r={22} fill={`url(#${ids.halo})`} opacity={0.8} />
      <Circle r={14.5} fill={`url(#${body})`} />
      <Circle r={14.5} fill="none" stroke={`url(#${rim})`} strokeWidth={w} />
      <Circle r={14.5} fill="none" stroke={`url(#${rim})`} strokeWidth={w + 6} opacity={0.25} filter={`url(#${ids.blurM})`} />
      <Ellipse cx={-5} cy={-7} rx={5} ry={2.6} fill={BrandColors.core} opacity={0.35} transform="rotate(-28 -5 -7)" />
      <G transform="scale(0.36)">
        <GlowLayers d={starPath(22, 0.2)} ids={ids} halo={26} />
      </G>
    </G>
  );
}

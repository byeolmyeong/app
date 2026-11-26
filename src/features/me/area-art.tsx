import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { BrandColors } from '@/constants/theme';
import type { MeArea } from '@/lib/api';

/** 네 갈래 별(-1~1 좌표) */
const STAR = 'M0,-1 Q0.18,-0.18 1,0 Q0.18,0.18 0,1 Q-0.18,0.18 -1,0 Q-0.18,-0.18 0,-1Z';
const HEART = 'M50 78 C28 64 20 52 20 40 C20 30 28 23 37 23 C43 23 47 26 50 31 C53 26 57 23 63 23 C72 23 80 30 80 40 C80 52 72 64 50 78Z';
const STEPS = 'M18 80 H38 V64 H56 V48 H74';
const MOON = 'M58 18 A30 30 0 1 0 82 62 A24 24 0 1 1 58 18 Z';
const WAVE = 'M20 84 Q30 78 40 84 T60 84 T80 84';
const SPARK = BrandColors.sparkle;
const STEP_FILL = BrandColors.stepFill;

const star = (x: number, y: number, s: number, fill: string, key: string) => (
  <Path key={key} transform={`translate(${x} ${y}) scale(${s})`} d={STAR} fill={fill} />
);

/**
 * 영역마다의 빛나는 그림(보드 12 받기 전의 칩 다섯 · 12-8~12-12 영역 카드 오른쪽 위): 성격 네 갈래 별 · 연애 하트 · 관계 이어진 두 별 ·
 * 일 계단과 별 · 감정 달. 뒤에 옅은 빛무리. 브랜드 자리의 장식이라 화면 읽기에서 숨긴다(결정 035).
 * icon 은 "자세한 풀이" 카드의 작은 칩(44), hero 는 영역 카드의 그림(92 — 반짝임이 더 있다).
 */
export function AreaArt({ area, size, variant }: { area: MeArea; size: number; variant: 'icon' | 'hero' }) {
  const id = `area${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const hero = variant === 'hero';
  const line = hero ? 2.5 : 4;
  let shape: React.ReactNode;
  switch (area) {
    case 'PERSONALITY':
      shape = hero
        ? [star(50, 50, 26, BrandColors.core, 'a'), star(76, 24, 6, SPARK, 'b'), star(24, 74, 4, SPARK, 'c'), <Circle key="d" cx={80} cy={66} r={2} fill={BrandColors.core} />]
        : star(50, 50, 28, BrandColors.core, 'a');
      break;
    case 'LOVE':
      shape = [<Path key="h" d={HEART} fill={BrandColors.core} />, hero ? star(78, 22, 6, SPARK, 's') : null];
      break;
    case 'RELATIONSHIP':
      shape = [
        <Path key="l" d="M30 60 L70 38" stroke={BrandColors.glowSoft} strokeWidth={line} strokeLinecap="round" />,
        star(30, 60, hero ? 17 : 18, BrandColors.core, 'a'),
        star(70, 38, hero ? 13 : 14, BrandColors.core, 'b'),
        hero ? <Circle key="d" cx={52} cy={80} r={2} fill={SPARK} /> : null,
      ];
      break;
    case 'WORK':
      shape = [
        <Path key="f" d={`${STEPS} V80 Z`} fill={STEP_FILL} />,
        <Path key="s" d={STEPS} fill="none" stroke={BrandColors.glowSoft} strokeWidth={line} strokeLinejoin="round" />,
        star(66, 30, hero ? 14 : 15, BrandColors.core, 'a'),
      ];
      break;
    case 'EMOTION':
      shape = [
        <Path key="m" d={MOON} fill={BrandColors.core} />,
        hero ? <Path key="w" d={WAVE} fill="none" stroke={BrandColors.glowSoft} strokeWidth={line} strokeLinecap="round" /> : null,
      ];
      break;
  }
  return (
    <View aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor={BrandColors.haloCenter} stopOpacity={hero ? 0.7 : 0.55} />
            <Stop offset="1" stopColor={BrandColors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={48} fill={`url(#${id})`} />
        {shape}
      </Svg>
    </View>
  );
}

import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { BrandColors } from '@/constants/theme';

/** 네 갈래 별(-1~1 좌표) · 달(보드 11-7) · 계단(보드 14-6 — 나 탭 일 그림의 계단) */
const STAR = 'M0,-1 Q0.18,-0.18 1,0 Q0.18,0.18 0,1 Q-0.18,0.18 -1,0 Q-0.18,-0.18 0,-1Z';
const MOON = 'M58 14 A36 36 0 1 0 86 68 A28 28 0 1 1 58 14 Z';
const STEPS = 'M18 80 H38 V64 H56 V48 H74';

/**
 * 오늘의 · 그날의 하늘 카드의 달(보드 11-7)과 다음 큰 변화 카드의 계단 위 별(보드 14-6): 200 칸 안의 옅은 빛무리 위에 그린다.
 * 브랜드 자리의 장식이라 화면 읽기에서 숨긴다(무엇의 카드인지는 칩이 말한다, 결정 035).
 */
export function SkyArt({ kind, size }: { kind: 'moon' | 'steps'; size: number }) {
  const id = `sky${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View testID={`share-art-${kind}`} aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id={id}>
            <Stop offset="0" stopColor={BrandColors.haloCenter} stopOpacity={0.55} />
            <Stop offset="1" stopColor={BrandColors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={100} cy={100} r={96} fill={`url(#${id})`} />
        {kind === 'moon' ? (
          <Path transform="translate(50 50)" d={MOON} fill={BrandColors.core} />
        ) : (
          <G transform="translate(20 20) scale(1.6)">
            <Path d={`${STEPS} V80 Z`} fill={BrandColors.stepFill} />
            <Path d={STEPS} fill="none" stroke={BrandColors.glowSoft} strokeWidth={2.5} strokeLinejoin="round" />
            <Path transform="translate(66 30) scale(14)" d={STAR} fill={BrandColors.core} />
          </G>
        )}
      </Svg>
    </View>
  );
}

import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';

export type BrandMarkProps = { height: number };

/** 그리는 좌표: 별(0~100) · 명(100~200), 둘레 6 여백 */
const VIEW = { x: -6, y: -6, w: 212, h: 112 };
const STROKE = 10;

/**
 * 로고 "구슬 받침 레터링"(결정 035): "별명" 을 한 획 굵기의 둥근 선으로 그리고, 명의 받침 ㅇ 을 주색 고리로 바꿨다.
 * 앱 안(홈 머리)은 작아서 고리를 주색 한 색으로 그린다. 유리 구슬 받침은 스플래시 · 공유 카드의 그림(assets/brand)에 있다.
 * 화면 읽기에서는 앱 이름으로 읽힌다.
 */
export function BrandMark({ height }: BrandMarkProps) {
  const width = Math.round((height * VIEW.w) / VIEW.h);
  const stroke = { stroke: Colors.ink, strokeWidth: STROKE, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <View testID="brand-mark" accessibilityRole="image" accessibilityLabel={strings.appName} style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}>
        {/* 별: ㅂ · ㅕ · ㄹ */}
        <G {...stroke}>
          <Path d="M12,10 V50 H44 V10 M12,30 H44" />
          <Path d="M80,6 V54 M60,21 H80 M60,39 H80" />
          <Path d="M16,64 H84 V79 H16 V94 H84" />
        </G>
        {/* 명: ㅁ · ㅕ · 받침 고리 */}
        <G transform="translate(100 0)">
          <G {...stroke}>
            <Path d="M12,10 H44 V50 H12 Z" />
            <Path d="M80,6 V54 M60,21 H80 M60,39 H80" />
          </G>
          <Circle cx={46} cy={79} r={14.5} fill="none" stroke={Colors.primary} strokeWidth={STROKE} />
        </G>
      </Svg>
    </View>
  );
}
